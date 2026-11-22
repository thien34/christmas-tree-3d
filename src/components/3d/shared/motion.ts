import * as THREE from 'three';
import { useStore } from '../../../store';
import type { SceneState } from '../../../types';

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

/** Tốc độ xoáy tối đa (rad/giây) khi bay về cây, và khoảng cách mà từ đó trở lên thì xoáy hết tốc độ. */
const SWIRL = { speed: 0.6, fullAt: 15 };
const Y_AXIS = new THREE.Vector3(0, 1, 0);

/**
 * Đưa `currentPos` tiến dần về vị trí ứng với trạng thái cảnh hiện tại.
 * Khi tụ về cây, phần tử còn xoáy quanh thân cây (giống lá, xem FoliageMaterial) nên bay theo đường xoắn ốc;
 * xoáy chậm dần khi tới gần nên vẫn dừng đúng chỗ.
 */
export const moveTowardsState = (item: MorphingItem, state: SceneState, speed: number, delta: number) => {
  const isFormed = state === 'FORMED';
  const target = isFormed ? item.targetPos : item.chaosPos;
  item.currentPos.lerp(target, damping(speed, delta));
  if (!isFormed) return item.currentPos;
  const remaining = item.currentPos.distanceTo(target);
  return item.currentPos.applyAxisAngle(Y_AXIS, SWIRL.speed * delta * Math.min(1, remaining / SWIRL.fullAt));
};

/** Xoay đối tượng theo vận tốc góc (rad/giây) trên từng trục. */
export const spin = (rotation: THREE.Euler, speed: THREE.Vector3, delta: number) => {
  rotation.x += speed.x * delta;
  rotation.y += speed.y * delta;
  rotation.z += speed.z * delta;
};

/** Tạo `count` phần tử, mỗi phần tử bắt đầu ở vị trí tán loạn của nó. */
export const createMorphingItems = <T extends Omit<MorphingItem, 'currentPos'>>(
  count: number,
  create: (index: number) => T,
): (T & MorphingItem)[] =>
  Array.from({ length: count }, (_, i) => {
    const item = create(i);
    return { ...item, currentPos: item.chaosPos.clone() };
  });

/** Phóng to dần lên kích thước thật khi cây thành hình, thu về 0 khi tán loạn (ngôi sao, thân cây). */
export const growWhenFormed = (object: THREE.Object3D, speed: number, delta: number) => {
  const target = useStore.getState().sceneState === 'FORMED' ? 1 : 0;
  const scale = THREE.MathUtils.damp(object.scale.x, target, speed, delta);
  object.scale.setScalar(scale);
  // Scale tiến sát 0 làm ma trận pháp tuyến gần suy biến (giá trị cực lớn trên GPU, dễ ra NaN qua Bloom);
  // ẩn hẳn khi đã quá nhỏ để không còn thấy, đồng thời bớt được draw call
  object.visible = scale > 1e-3;
};
