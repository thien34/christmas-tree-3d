import { useRef } from 'react';
import { useHandTracking } from '../gesture/useHandTracking';
import { useStore } from '../store';

/**
 * Điều khiển cảnh bằng cử chỉ tay qua webcam.
 * Video và canvas luôn có trong DOM (MediaPipe cần đọc khung hình); chỉ hiện ra ở góc phải khi bật debug.
 */
export const GestureController = () => {
  const debugMode = useStore((s) => s.debugMode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useHandTracking(videoRef, canvasRef);

  const previewClass = `camera-preview${debugMode ? ' is-visible' : ''}`;
  return (
    <>
      <video ref={videoRef} className={previewClass} playsInline muted />
      <canvas ref={canvasRef} className={previewClass} />
    </>
  );
};
