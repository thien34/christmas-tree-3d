import * as THREE from 'three';
import type { HandPosition } from '../../../types';

const projected = new THREE.Vector3();

/**
 * Trả về đối tượng nằm gần điểm `screenPoint` nhất trên màn hình (toạ độ 0–1),
 * bỏ qua các đối tượng ở sau camera. Trả về null nếu không có đối tượng nào.
 */
export const pickNearestOnScreen = (
  objects: readonly THREE.Object3D[],
  camera: THREE.Camera,
  screenPoint: HandPosition,
) => {
  // Đổi sang toạ độ NDC (-1..1, trục Y hướng lên)
  const ndcX = screenPoint.x * 2 - 1;
  const ndcY = 1 - screenPoint.y * 2;

  let nearest: THREE.Object3D | null = null;
  let nearestDistance = Infinity;
  for (const object of objects) {
    object.getWorldPosition(projected).project(camera);
    if (projected.z > 1) continue; // nằm sau camera

    const distance = Math.hypot(projected.x - ndcX, projected.y - ndcY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = object;
    }
  }
  return nearest;
};
