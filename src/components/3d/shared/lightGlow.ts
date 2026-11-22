import * as THREE from 'three';
import { CONFIG } from '../../../constants/config';
import { sampleLightPoint } from '../../../utils/treePositions';

/*
 * Ánh đèn hắt lên lá: bóng đèn (FairyLights) và lá (Foliage) cùng biết vị trí các bóng trên cây.
 * - Lúc tạo lá, mỗi lá ghi lại bóng đèn gần nó nhất và khoảng cách tới bóng đó.
 * - Mỗi khung hình FairyLights ghi màu × độ sáng hiện tại của từng bóng vào LIGHT_GLOW_TEXTURE (1 hàng, mỗi bóng 1 texel).
 * - Shader lá đọc đúng texel của bóng gần nhất và ửng màu theo, mờ dần theo khoảng cách.
 */

const COUNT = CONFIG.counts.lights;

/** Vị trí các bóng đèn khi cây đã thành hình (toạ độ cục bộ của cây); tạo một lần, dùng chung. */
export const LIGHT_POSITIONS: readonly THREE.Vector3[] = Array.from({ length: COUNT }, () => sampleLightPoint());

/** RGB = màu × độ sáng hiện tại của từng bóng. Float để giữ được độ sáng > 1. */
export const LIGHT_GLOW_DATA = new Float32Array(COUNT * 4);
export const LIGHT_GLOW_TEXTURE = new THREE.DataTexture(LIGHT_GLOW_DATA, COUNT, 1, THREE.RGBAFormat, THREE.FloatType);

/** Lá xa bóng gần nhất hơn khoảng này thì coi như không được chiếu (đánh dấu bằng chỉ số -1). */
export const GLOW_REACH = 2.6;

const CELL = GLOW_REACH;
const cellKey = (x: number, y: number, z: number) => `${x},${y},${z}`;

/** Chia không gian thành ô để mỗi lá chỉ phải so với các bóng trong 27 ô quanh nó thay vì cả 220 bóng. */
const buildGrid = () => {
  const grid = new Map<string, number[]>();
  LIGHT_POSITIONS.forEach((p, i) => {
    const key = cellKey(Math.floor(p.x / CELL), Math.floor(p.y / CELL), Math.floor(p.z / CELL));
    const bucket = grid.get(key);
    if (bucket) bucket.push(i);
    else grid.set(key, [i]);
  });
  return grid;
};

/** Trả về hàm tìm bóng gần nhất: ghi vào `out` [chỉ số bóng (-1 nếu quá xa), khoảng cách]. */
export const createNearestLightFinder = () => {
  const grid = buildGrid();
  return (x: number, y: number, z: number, out: Float32Array, offset: number) => {
    const cx = Math.floor(x / CELL);
    const cy = Math.floor(y / CELL);
    const cz = Math.floor(z / CELL);
    let best = -1;
    let bestDist = GLOW_REACH * GLOW_REACH;
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = grid.get(cellKey(cx + dx, cy + dy, cz + dz));
          if (!bucket) continue;
          for (const i of bucket) {
            const p = LIGHT_POSITIONS[i];
            const d = (p.x - x) ** 2 + (p.y - y) ** 2 + (p.z - z) ** 2;
            if (d < bestDist) {
              bestDist = d;
              best = i;
            }
          }
        }
    out[offset] = best;
    out[offset + 1] = Math.sqrt(bestDist);
  };
};
