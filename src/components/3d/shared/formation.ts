import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../../store';

/** Cùng tốc độ với lá cây (Foliage), để mọi hiệu ứng bám theo đúng lúc tán lá tụ lại. */
const PROGRESS_SPEED = 1.5;
/** Sau khi bấm thành cây chừng này giây (lá đã gần tụ đủ) thì loé sáng từ ngôi sao. */
const BURST_DELAY = 1.6;

/**
 * Tiến độ thành cây dùng chung cho các hiệu ứng: dây kim tuyến, quầng sao, loé sáng, camera...
 * Cập nhật một lần mỗi khung hình bởi `useFormationTracker` (chạy trước mọi useFrame khác).
 */
export const formation = {
  /** 0 = tán loạn, 1 = đã thành cây; chuyển mượt. */
  progress: 0,
  /** Thời điểm (giây, theo clock của R3F) của lần loé sáng gần nhất; -Infinity nếu chưa có. */
  burstAt: -Infinity,
  /** Thời điểm hiện tại, để component khác khỏi phải tự đọc clock. */
  now: 0,
  wasFormed: false,
};

/** Đã loé sáng được bao nhiêu giây (âm hoặc Infinity nếu chưa loé). */
export const burstAge = () => formation.now - formation.burstAt;

/** Gọi một lần trong cảnh (Experience). Priority âm: chạy trước các useFrame khác và không giành việc render. */
export const useFormationTracker = () =>
  useFrame(({ clock }, delta) => {
    const isFormed = useStore.getState().sceneState === 'FORMED';
    formation.now = clock.elapsedTime;
    formation.progress = THREE.MathUtils.damp(formation.progress, isFormed ? 1 : 0, PROGRESS_SPEED, delta);
    if (isFormed && !formation.wasFormed) formation.burstAt = clock.elapsedTime + BURST_DELAY;
    if (!isFormed) formation.burstAt = -Infinity;
    formation.wasFormed = isFormed;
  }, -1);
