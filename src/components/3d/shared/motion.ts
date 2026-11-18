import { useLayoutEffect } from 'react';
import * as THREE from 'three';
import type { SceneState, TreeStyle } from '../../../types';

/** Một phần tử chuyển động qua lại giữa vị trí tán loạn (CHAOS) và vị trí trên cây (FORMED). */
export interface MorphingItem {
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  currentPos: THREE.Vector3;
}

/**
 * Hệ số nội suy độc lập với FPS: mỗi giây tiến về đích theo hàm mũ với tốc độ `speed`.
 * Không bao giờ vượt quá 1 nên không bị "lố" khi khung hình bị giật.
 */
export const damping = (speed: number, delta: number) => 1 - Math.exp(-speed * delta);

/** Đưa `currentPos` tiến dần về vị trí ứng với trạng thái cảnh hiện tại. */
export const moveTowardsState = (item: MorphingItem, state: SceneState, speed: number, delta: number) =>
  item.currentPos.lerp(state === 'FORMED' ? item.targetPos : item.chaosPos, damping(speed, delta));

/** Xoay đối tượng theo vận tốc góc (rad/giây) trên từng trục. */
export const spin = (rotation: THREE.Euler, speed: THREE.Vector3, delta: number) => {
  rotation.x += speed.x * delta;
  rotation.y += speed.y * delta;
  rotation.z += speed.z * delta;
};

/** Tạo `count` phần tử bắt đầu ở vị trí tán loạn; `targetPos` được điền bởi `useTreeTargets`. */
export const createMorphingItems = <T extends object>(
  count: number,
  create: (index: number) => T & { chaosPos: THREE.Vector3 },
): (T & MorphingItem)[] =>
  Array.from({ length: count }, (_, i) => {
    const item = create(i);
    return { ...item, targetPos: new THREE.Vector3(), currentPos: item.chaosPos.clone() };
  });

/** Hàm lấy mẫu vị trí trên cây cho phần tử thứ `index` trong tổng số `count`. */
export type TreeTargetSampler = (style: TreeStyle, index: number, count: number, out: THREE.Vector3) => void;

/**
 * Tính lại vị trí trên cây của từng phần tử mỗi khi đổi kiểu cây (cập nhật tại chỗ, không re-render).
 * `sample` phải là hàm ổn định (khai báo ngoài component), nếu không vị trí sẽ bị tính lại mỗi lần render.
 */
export const useTreeTargets = (items: readonly MorphingItem[], treeStyle: TreeStyle, sample: TreeTargetSampler) => {
  useLayoutEffect(() => {
    items.forEach((item, i) => sample(treeStyle, i, items.length, item.targetPos));
  }, [items, treeStyle, sample]);
};
