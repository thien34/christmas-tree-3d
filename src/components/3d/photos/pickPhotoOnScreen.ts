import * as THREE from 'three';
import type { HandPosition } from '../../../types';

const projected = new THREE.Vector3();

/**
 * Trả về index của đối tượng nằm gần điểm `screenPoint` nhất trên màn hình (toạ độ 0–1),
 * bỏ qua các đối tượng ở sau camera. Trả về -1 nếu không có đối tượng nào.
 */
export const pickNearestOnScreen = (
  objects: readonly THREE.Object3D[],
  camera: THREE.Camera,
  screenPoint: HandPosition,
) => {
  // Đổi sang toạ độ NDC (-1..1, trục Y hướng lên)
  const ndcX = screenPoint.x * 2 - 1;
  const ndcY = 1 - screenPoint.y * 2;

  let nearestIndex = -1;
  let nearestDistance = Infinity;
  objects.forEach((object, i) => {
    object.getWorldPosition(projected).project(camera);
    if (projected.z > 1) return; // nằm sau camera

    const distance = Math.hypot(projected.x - ndcX, projected.y - ndcY);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = i;
    }
  });
  return nearestIndex;
};
