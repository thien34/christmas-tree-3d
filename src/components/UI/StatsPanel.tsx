import { useEffect, useState } from 'react';
import { trackingStats } from '../../gesture/useHandTracking';

/** Cập nhật số liệu chừng này lần mỗi giây: đủ để đọc, không làm React render lại liên tục. */
const UPDATE_INTERVAL_MS = 500;

/** `performance.memory` chỉ có trên Chrome/Edge (không nằm trong chuẩn nên TypeScript không khai báo). */
interface MemoryInfo {
  usedJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface Stats {
  fps: number;
  /** Khung hình chậm nhất trong lần đo vừa rồi (ms): giật lag thấy rõ ở đây hơn là ở FPS trung bình. */
  worstFrameMs: number;
  heapMb: number | null;
  heapLimitMb: number | null;
  handFps: number;
  inferenceMs: number;
}

const toMb = (bytes: number) => bytes / 1024 / 1024;

/**
 * Đo FPS bằng requestAnimationFrame: R3F cũng vẽ theo rAF, nên đây chính là tốc độ vẽ cảnh 3D.
 * Chỉ chạy khi được mount (lúc bật debug), không tốn gì khi tắt.
 */
const useStats = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    let frameId = 0;
    let frames = 0;
    let worstFrameMs = 0;
    let lastFrame = performance.now();
    let windowStart = lastFrame;
    let handFramesAtStart = trackingStats.frames;

    const onFrame = (now: number) => {
      frameId = requestAnimationFrame(onFrame);
      frames++;
      worstFrameMs = Math.max(worstFrameMs, now - lastFrame);
      lastFrame = now;

      const elapsed = now - windowStart;
      if (elapsed < UPDATE_INTERVAL_MS) return;

      const memory = (performance as Performance & { memory?: MemoryInfo }).memory;
      setStats({
        fps: (frames * 1000) / elapsed,
        worstFrameMs,
        heapMb: memory ? toMb(memory.usedJSHeapSize) : null,
        heapLimitMb: memory ? toMb(memory.jsHeapSizeLimit) : null,
        handFps: ((trackingStats.frames - handFramesAtStart) * 1000) / elapsed,
        inferenceMs: trackingStats.inferenceMs,
      });
      frames = 0;
      worstFrameMs = 0;
      windowStart = now;
      handFramesAtStart = trackingStats.frames;
    };
    frameId = requestAnimationFrame(onFrame);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return stats;
};

/** FPS dưới 30 thì đổi màu cảnh báo, dưới 20 thì báo đỏ. */
const fpsLevel = (fps: number) => (fps < 20 ? 'is-bad' : fps < 30 ? 'is-warn' : '');

/** Bảng chỉ số hiệu năng: FPS cảnh 3D, khung hình chậm nhất, RAM (JS heap), tốc độ nhận diện tay. */
export const StatsPanel = () => {
  const stats = useStats();
  if (!stats) return <div className="stats-panel">Measuring…</div>;

  const ram = stats.heapMb === null ? 'n/a' : `${stats.heapMb.toFixed(0)} MB`;
  const ramLimit = stats.heapLimitMb === null ? '' : ` (limit ${stats.heapLimitMb.toFixed(0)} MB)`;
  return (
    <dl className="stats-panel">
      <div title="Frames per second · slowest frame in the last half second">
        <dt>FPS</dt>
        <dd>
          <span className={fpsLevel(stats.fps)}>{stats.fps.toFixed(0)}</span> · {stats.worstFrameMs.toFixed(1)} ms
        </dd>
      </div>
      <div title={`JavaScript heap, Chrome / Edge only${ramLimit}`}>
        <dt>RAM</dt>
        <dd>{ram}</dd>
      </div>
      <div title="Hand tracking: frames per second · model time per frame">
        <dt>Hand</dt>
        <dd>
          {stats.handFps.toFixed(0)} fps · {stats.inferenceMs.toFixed(0)} ms
        </dd>
      </div>
    </dl>
  );
};
