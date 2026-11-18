import { useEffect, useEffectEvent, useRef, type RefObject } from 'react';
import type { DrawingUtils, GestureRecognizer, GestureRecognizerResult } from '@mediapipe/tasks-vision';
import { GESTURE_COOLDOWN_MS, GESTURE_MIN_SCORE } from '../constants/config';
import type { FingerCount, HandPosition, SceneState } from '../types';
import { countFingers, detectPinch } from './handGestures';

/** Phiên bản file WASM phải khớp với phiên bản thư viện; Vite điền sẵn từ package.json (xem vite.config.ts). */
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${__MEDIAPIPE_VERSION__}/wasm`;
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task';

const CAMERA_ERRORS: Record<string, string> = {
  NotAllowedError: 'Camera permission denied',
  NotFoundError: 'No camera found',
  NotReadableError: 'Camera in use by another app',
  OverconstrainedError: 'Camera constraints not met',
};

const describeError = (error: unknown) =>
  `ERROR: ${error instanceof Error ? (CAMERA_ERRORS[error.name] ?? error.message) : 'Hand tracking failed'}`;

export interface HandTrackingHandlers {
  onSceneState: (state: SceneState) => void;
  onStatus: (status: string) => void;
  /** Gọi khi bắt đầu chụm tay (kèm vị trí) và khi thả ra (null). */
  onPinch: (position: HandPosition | null) => void;
  onThumbUp: () => void;
  onFingerCount: (count: FingerCount) => void;
}

interface UseHandTrackingOptions extends HandTrackingHandlers {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  debugMode: boolean;
}

interface DebugOverlay {
  drawingUtils: DrawingUtils;
  connections: typeof GestureRecognizer.HAND_CONNECTIONS;
}

/**
 * Bật camera, chạy MediaPipe Gesture Recognizer trên từng khung hình mới và chuyển kết quả thành sự kiện:
 * xoè tay → CHAOS, nắm tay → FORMED, giơ ngón cái → đổi theme, 1–3 ngón → đổi kiểu cây, chụm tay → phóng to ảnh.
 */
export const useHandTracking = ({ videoRef, canvasRef, debugMode, ...handlers }: UseHandTrackingOptions) => {
  const lastStatusRef = useRef('');
  const wasPinchingRef = useRef(false);
  const lastThumbUpRef = useRef(0);
  const lastFingerCountRef = useRef<{ count: FingerCount | null; time: number }>({ count: null, time: 0 });
  const overlayRef = useRef<DebugOverlay | null>(null);

  /** Chỉ cập nhật trạng thái khi nội dung thay đổi, tránh setState mỗi khung hình. */
  const reportStatus = useEffectEvent((status: string) => {
    if (status === lastStatusRef.current) return;
    lastStatusRef.current = status;
    handlers.onStatus(status);
  });

  /** Vẽ khung xương bàn tay lên canvas khi bật debug, xoá canvas khi tắt. */
  const drawOverlay = useEffectEvent((result: GestureRecognizerResult) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas?.getContext('2d');
    const overlay = overlayRef.current;
    if (!canvas || !video || !ctx || !overlay) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!debugMode) return;

    for (const landmarks of result.landmarks) {
      overlay.drawingUtils.drawConnectors(landmarks, overlay.connections, { lineWidth: 2 });
      overlay.drawingUtils.drawLandmarks(landmarks, { lineWidth: 1 });
    }
  });

  const handleResult = useEffectEvent((result: GestureRecognizerResult, now: number) => {
    const landmarks = result.landmarks[0];
    const gesture = result.gestures[0]?.[0];
    const isConfident = gesture !== undefined && gesture.score > GESTURE_MIN_SCORE;

    // Chụm tay: chỉ báo lúc bắt đầu và lúc kết thúc
    const pinch = landmarks ? detectPinch(landmarks) : null;
    if ((pinch !== null) !== wasPinchingRef.current) {
      wasPinchingRef.current = pinch !== null;
      handlers.onPinch(pinch);
    }

    if (isConfident) {
      const name = gesture.categoryName;
      if (name === 'Open_Palm') handlers.onSceneState('CHAOS');
      if (name === 'Closed_Fist') handlers.onSceneState('FORMED');

      if (name === 'Thumb_Up' && now - lastThumbUpRef.current > GESTURE_COOLDOWN_MS.thumbUp) {
        lastThumbUpRef.current = now;
        handlers.onThumbUp();
      }

      const fingers = countFingers(name, landmarks);
      const last = lastFingerCountRef.current;
      if (fingers && fingers !== last.count && now - last.time > GESTURE_COOLDOWN_MS.fingerCount) {
        lastFingerCountRef.current = { count: fingers, time: now };
        handlers.onFingerCount(fingers);
      }
    }

    if (debugMode) {
      const pinchLabel = pinch ? ' [PINCH]' : '';
      if (!gesture) reportStatus(`AI READY: NO HAND${pinchLabel}`);
      else if (isConfident) reportStatus(`DETECTED: ${gesture.categoryName}${pinchLabel}`);
    }
    drawOverlay(result);
  });

  // Khởi tạo model + camera đúng một lần; đổi debugMode hay handler không làm tải lại model/camera.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let recognizer: GestureRecognizer | null = null;
    let stream: MediaStream | null = null;
    let frameId = 0;
    let lastVideoTime = -1;

    const loop = () => {
      // Chỉ nhận diện khi camera có khung hình mới
      if (recognizer && video.readyState >= video.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const now = performance.now();
        handleResult(recognizer.recognizeForVideo(video, now), now);
      }
      frameId = requestAnimationFrame(loop);
    };

    const start = async () => {
      try {
        reportStatus('DOWNLOADING AI...');
        // Tải lazy để cảnh 3D hiện ra trước, không phải chờ thư viện MediaPipe
        const vision = await import('@mediapipe/tasks-vision');
        const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
        const created = await vision.GestureRecognizer.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        });
        if (cancelled) {
          created.close();
          return;
        }
        recognizer = created;

        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) {
          overlayRef.current = {
            drawingUtils: new vision.DrawingUtils(ctx),
            connections: vision.GestureRecognizer.HAND_CONNECTIONS,
          };
        }

        reportStatus('REQUESTING CAMERA...');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API not available');
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) return;

        video.srcObject = stream;
        await video.play();
        reportStatus('AI READY: SHOW HAND');
        loop();
      } catch (error) {
        // AbortError: video.play() bị ngắt vì component unmount, không phải lỗi thật
        if (cancelled || (error instanceof Error && error.name === 'AbortError')) return;
        console.error('Hand tracking error:', error);
        reportStatus(describeError(error));
      }
    };

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      recognizer?.close();
      overlayRef.current = null;
    };
  }, [videoRef, canvasRef]);
};
