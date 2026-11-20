import { useEffect, type RefObject } from 'react';
import type { GestureRecognizer, GestureRecognizerResult } from '@mediapipe/tasks-vision';
import { GESTURE_MIN_SCORE, THUMB_UP_COOLDOWN_MS } from '../constants/config';
import { cycleTheme, setStatus, useStore } from '../store';
import { detectPinch } from './handGestures';

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

/**
 * Số liệu đo của vòng nhận diện tay, cho bảng chỉ số ở chế độ debug đọc định kỳ.
 * Để ngoài store vì cập nhật mỗi khung hình camera; đưa vào store sẽ làm React render lại liên tục.
 */
export const trackingStats = {
  /** Tổng số khung hình camera đã nhận diện (bảng chỉ số tự lấy hiệu để ra FPS). */
  frames: 0,
  /** Thời gian chạy model cho khung hình gần nhất (ms). */
  inferenceMs: 0,
};

const describeError = (error: unknown) =>
  `ERROR: ${error instanceof Error ? (CAMERA_ERRORS[error.name] ?? error.message) : 'Hand tracking failed'}`;

/**
 * Tạo hàm chuyển kết quả nhận diện của từng khung hình thành thay đổi trong store:
 * xoè tay → CHAOS, nắm tay → FORMED, giơ ngón cái → đổi theme, chụm tay → phóng to ảnh.
 */
const createGestureHandler = () => {
  let lastThumbUp = 0;

  return (result: GestureRecognizerResult, now: number) => {
    const { pinch: activePinch, debugMode } = useStore.getState();
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

      if (name === 'Thumb_Up' && now - lastThumbUp > THUMB_UP_COOLDOWN_MS) {
        lastThumbUp = now;
        cycleTheme();
      }
    }

    if (debugMode) {
      const pinchLabel = pinch ? ' · pinch' : '';
      if (!gesture) setStatus(`No hand detected${pinchLabel}`);
      else if (isConfident) setStatus(`Gesture: ${gesture.categoryName}${pinchLabel}`);
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
    let frameErrorLogged = false;
    const stopCamera = () => stream?.getTracks().forEach((track) => track.stop());

    const start = async () => {
      setStatus('Loading hand tracking…');
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

      setStatus('Waiting for camera…');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API not available');
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (cancelled) return stopCamera();

      video.srcObject = stream;
      await video.play();
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setStatus('Ready · show your hand');

      const handleGestures = createGestureHandler();
      const drawingUtils = new vision.DrawingUtils(ctx);

      const onVideoFrame: VideoFrameRequestCallback = (now) => {
        frameId = video.requestVideoFrameCallback(onVideoFrame);
        let result: GestureRecognizerResult;
        try {
          const startedAt = performance.now();
          result = model.recognizeForVideo(video, now);
          trackingStats.inferenceMs = performance.now() - startedAt;
          trackingStats.frames++;
        } catch (error) {
          // Một khung hình lỗi (vd. video đổi kích thước) thì bỏ qua; chỉ báo một lần để không spam console
          if (!frameErrorLogged) console.error('Hand tracking frame error:', error);
          frameErrorLogged = true;
          return;
        }
        handleGestures(result, now);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (useStore.getState().debugMode) {
          for (const landmarks of result.landmarks) {
            drawingUtils.drawConnectors(landmarks, vision.GestureRecognizer.HAND_CONNECTIONS, { lineWidth: 2 });
            drawingUtils.drawLandmarks(landmarks, { lineWidth: 1 });
          }
        }
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
