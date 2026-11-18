import { useRef } from 'react';
import { useHandTracking, type HandTrackingHandlers } from '../gesture/useHandTracking';

interface GestureControllerProps extends HandTrackingHandlers {
  debugMode: boolean;
}

/**
 * Điều khiển cảnh bằng cử chỉ tay qua webcam.
 * Video và canvas luôn có trong DOM (MediaPipe cần đọc khung hình); chỉ hiện ra ở góc phải khi bật debug.
 */
export const GestureController = ({ debugMode, ...handlers }: GestureControllerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useHandTracking({ videoRef, canvasRef, debugMode, ...handlers });

  const previewClass = `camera-preview${debugMode ? ' is-visible' : ''}`;
  return (
    <>
      <video ref={videoRef} className={previewClass} playsInline muted />
      <canvas ref={canvasRef} className={previewClass} />
    </>
  );
};
