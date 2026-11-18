import { useEffect, type RefObject } from 'react';
import type { GestureRecognizer, GestureRecognizerResult } from '@mediapipe/tasks-vision';
import { GESTURE_COOLDOWN_MS, GESTURE_MIN_SCORE } from '../constants/config';
import { cycleTheme, setStatus, useStore } from '../store';
import type { FingerCount, TreeStyle } from '../types';
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

const STYLE_BY_FINGER_COUNT: Record<FingerCount, TreeStyle> = { 1: 'classic', 2: 'tiered', 3: 'spiral' };

/**
 * Tạo hàm chuyển kết quả nhận diện của từng khung hình thành thay đổi trong store:
 * xoè tay → CHAOS, nắm tay → FORMED, giơ ngón cái → đổi theme, 1–3 ngón → đổi kiểu cây, chụm tay → phóng to ảnh.
 */
const createGestureHandler = () => {
  let lastThumbUp = 0;
  let lastStyleChange = 0;

  return (result: GestureRecognizerResult, now: number) => {
    const { pinch: activePinch, treeStyle, debugMode } = useStore.getState();
    const landmarks = result.landmarks[0];
    const gesture = result.gestures[0]?.[0];
    const isConfident = gesture !== undefined && gesture.score > GESTURE_MIN_SCORE;

    // Chụm tay: chỉ ghi lại lúc bắt đầu (kèm vị trí) và lúc thả ra
    const pinch = landmarks ? detectPinch(landmarks) : null;
    if ((pinch !== null) !== (activePinch !== null)) useStore.setState({ pinch });

    if (isConfident) {
      const name = gesture.categoryName;
      if (name === 'Open_Palm') useStore.setState({ sceneState: 'CHAOS' });
      if (name === 'Closed_Fist') useStore.setState({ sceneState: 'FORMED' });

      if (name === 'Thumb_Up' && now - lastThumbUp > GESTURE_COOLDOWN_MS.thumbUp) {
        lastThumbUp = now;
        cycleTheme();
      }

      const fingers = countFingers(name, landmarks);
      const style = fingers && STYLE_BY_FINGER_COUNT[fingers];
      if (style && style !== treeStyle && now - lastStyleChange > GESTURE_COOLDOWN_MS.fingerCount) {
        lastStyleChange = now;
        useStore.setState({ treeStyle: style });
      }
    }

    if (debugMode) {
      const pinchLabel = pinch ? ' [PINCH]' : '';
      if (!gesture) setStatus(`AI READY: NO HAND${pinchLabel}`);
      else if (isConfident) setStatus(`DETECTED: ${gesture.categoryName}${pinchLabel}`);
    }
  };
};

/**
 * Bật camera và chạy MediaPipe Gesture Recognizer trên từng khung hình mới của video.
 * Khi bật debug, vẽ thêm khung xương bàn tay lên canvas.
 */
export const useHandTracking = (
  videoRef: RefObject<HTMLVideoElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
) => {
  // Khởi tạo model + camera đúng một lần; mọi trạng thái khác đọc thẳng từ store nên không phải chạy lại.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!video || !canvas || !ctx) return;

    let cancelled = false;
    let recognizer: GestureRecognizer | null = null;
    let stream: MediaStream | null = null;
    let frameId = 0;
    const stopCamera = () => stream?.getTracks().forEach((track) => track.stop());

    const start = async () => {
      setStatus('DOWNLOADING AI...');
      // Tải lazy để cảnh 3D hiện ra trước, không phải chờ thư viện MediaPipe
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_URL);
      const model = await vision.GestureRecognizer.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      // Unmount trong lúc đang tải: cleanup đã chạy trước khi có model/camera nên phải tự giải phóng ở đây
      if (cancelled) return model.close();
      recognizer = model;

      setStatus('REQUESTING CAMERA...');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API not available');
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (cancelled) return stopCamera();

      video.srcObject = stream;
      await video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setStatus('AI READY: SHOW HAND');

      const handleGestures = createGestureHandler();
      const drawingUtils = new vision.DrawingUtils(ctx);

      const onVideoFrame: VideoFrameRequestCallback = (now) => {
        const result = model.recognizeForVideo(video, now);
        handleGestures(result, now);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (useStore.getState().debugMode) {
          for (const landmarks of result.landmarks) {
            drawingUtils.drawConnectors(landmarks, vision.GestureRecognizer.HAND_CONNECTIONS, { lineWidth: 2 });
            drawingUtils.drawLandmarks(landmarks, { lineWidth: 1 });
          }
        }
        frameId = video.requestVideoFrameCallback(onVideoFrame);
      };
      frameId = video.requestVideoFrameCallback(onVideoFrame);
    };

    start().catch((error: unknown) => {
      // AbortError: video.play() bị ngắt vì component unmount, không phải lỗi thật
      if (cancelled || (error instanceof Error && error.name === 'AbortError')) return;
      console.error('Hand tracking error:', error);
      setStatus(describeError(error));
    });

    return () => {
      cancelled = true;
      video.cancelVideoFrameCallback(frameId);
      stopCamera();
      video.srcObject = null;
      recognizer?.close();
    };
  }, [videoRef, canvasRef]);
};
