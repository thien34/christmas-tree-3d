import { useRef } from 'react';
import { useHandTracking } from '../gesture/useHandTracking';
import { useStore } from '../store';
import { StatsPanel } from './UI/StatsPanel';
import { useCornerDock } from './useCornerDock';

/**
 * Điều khiển cảnh bằng cử chỉ tay qua webcam.
 * Video và canvas luôn có trong DOM (MediaPipe cần đọc khung hình); khi bật debug chúng hiện trong một khung
 * 16:9 kèm bảng chỉ số, kéo thả được tới 4 góc màn hình.
 */
export const GestureController = () => {
  const debugMode = useStore((s) => s.debugMode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dock = useCornerDock<HTMLDivElement>('top-right');

  useHandTracking(videoRef, canvasRef);

  const dockClass = [
    'camera-dock',
    debugMode && 'is-visible',
    dock.isDragging && 'is-dragging',
    dock.isSnapping && 'is-snapping',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div
      ref={dock.ref}
      className={dockClass}
      style={debugMode ? dock.style : undefined}
      title={debugMode ? 'Drag to move to another corner' : undefined}
      {...dock.handlers}
    >
      <div className="camera-dock__frame">
        <video ref={videoRef} className="camera-dock__video" playsInline muted />
        <canvas ref={canvasRef} className="camera-dock__overlay" />
        {/* Đè lên hình camera, không làm khung to thêm */}
        {debugMode && <StatsPanel />}
      </div>
    </div>
  );
};
