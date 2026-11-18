import * as THREE from 'three';
import { CONFIG } from '../constants/config';
import type { TreeStyle } from '../types';
import { randomAngle, randomRange, randomSpread, randomWeightedIndex } from './random';

/*
 * Các hàm lấy mẫu vị trí trên cây thông.
 * Toạ độ cục bộ: trục Y hướng lên, gốc cây ở y = -height/2, đỉnh ở y = +height/2.
 * `t` là chiều cao chuẩn hoá: 0 = gốc, 1 = đỉnh.
 * Mọi hàm ghi kết quả vào `out` và trả về chính `out` để tránh cấp phát trong vòng lặp.
 */

const { height: HEIGHT, radius: RADIUS } = CONFIG.tree;

const TIER_COUNT = 4;
/** Tầng dưới có nhiều hạt hơn tầng trên. */
const TIER_WEIGHTS = [0.35, 0.3, 0.22, 0.13];
const FOLIAGE_SPIRAL_TURNS = 8;
const LIGHT_SPIRAL_TURNS = 12;

const heightAt = (t: number) => t * HEIGHT - HEIGHT / 2;
const coneRadiusAt = (t: number) => RADIUS * (1 - t);

/** Đặt `out` theo toạ độ trụ (bán kính, góc, độ cao). */
const setCylindrical = (out: THREE.Vector3, radius: number, theta: number, y: number) =>
  out.set(radius * Math.cos(theta), y, radius * Math.sin(theta));

/* ---------- Lá cây: phân bố trong toàn bộ thể tích ---------- */

const sampleClassicVolume = (out: THREE.Vector3) => {
  const t = Math.random();
  return setCylindrical(out, Math.random() * coneRadiusAt(t), randomAngle(), heightAt(t));
};

/** Nhiều hình nón cụt xếp chồng. */
const sampleTieredVolume = (out: THREE.Vector3) => {
  const tier = randomWeightedIndex(TIER_WEIGHTS);
  const tierHeight = HEIGHT / TIER_COUNT;
  const radiusBottom = RADIUS * (1 - tier / TIER_COUNT) * 1.1;
  const radiusTop = RADIUS * (1 - (tier + 0.8) / TIER_COUNT) * 0.7;

  const tInTier = Math.random();
  const radius = THREE.MathUtils.lerp(radiusBottom, radiusTop, tInTier);
  const y = -HEIGHT / 2 + (tier + tInTier) * tierHeight;
  return setCylindrical(out, Math.random() * radius, randomAngle(), y);
};

/** Các nhánh xoắn ốc quanh thân cây. */
const sampleSpiralVolume = (out: THREE.Vector3) => {
  const t = Math.random();
  const theta = t * FOLIAGE_SPIRAL_TURNS * Math.PI * 2 + randomSpread(1.2);
  const radius = coneRadiusAt(t) * randomRange(0.7, 1);
  return setCylindrical(out, radius, theta, heightAt(t));
};

/** Vị trí một hạt lá theo kiểu cây. */
export const sampleFoliagePoint = (style: TreeStyle, out: THREE.Vector3) => {
  switch (style) {
    case 'tiered':
      return sampleTieredVolume(out);
    case 'spiral':
      return sampleSpiralVolume(out);
    case 'classic':
      return sampleClassicVolume(out);
  }
};

/* ---------- Đồ trang trí: nằm trên bề mặt cây ---------- */

/**
 * Vị trí một món trang trí. Kiểu classic đặt trên bề mặt nón, dày ở gốc và thưa dần lên đỉnh;
 * `excludeTop` (0–1) bỏ bớt phần chóp. Các kiểu khác dùng chung phân bố với lá cây.
 */
export const sampleOrnamentPoint = (style: TreeStyle, out: THREE.Vector3, excludeTop = 0) => {
  if (style !== 'classic') return sampleFoliagePoint(style, out);

  const t = Math.pow(Math.random(), 1.8) * (1 - excludeTop);
  return setCylindrical(out, coneRadiusAt(t), randomAngle(), heightAt(t));
};

/* ---------- Đèn: xếp theo thứ tự index ---------- */

/** Dây đèn quấn xoắn ốc, phân bố đều theo chiều cao. */
const sampleSpiralLight = (index: number, count: number, out: THREE.Vector3) => {
  const t = index / count;
  return setCylindrical(out, coneRadiusAt(t) * 0.95, t * LIGHT_SPIRAL_TURNS * Math.PI * 2, heightAt(t));
};

/** Mỗi tầng một vòng đèn quanh mép ngoài. */
const sampleTieredLight = (index: number, count: number, out: THREE.Vector3) => {
  const lightsPerTier = Math.max(1, Math.floor(count / TIER_COUNT));
  const tier = Math.min(Math.floor(index / lightsPerTier), TIER_COUNT - 1);
  const tierHeight = HEIGHT / TIER_COUNT;

  const theta = ((index % lightsPerTier) / lightsPerTier) * Math.PI * 2;
  const radius = RADIUS * (1 - tier / TIER_COUNT) * 1.05 + randomSpread(0.5);
  const y = -HEIGHT / 2 + (tier + 0.6) * tierHeight + randomSpread(tierHeight * 0.4);
  return setCylindrical(out, radius, theta, y);
};

/** Vị trí bóng đèn thứ `index` trong tổng số `count` bóng. */
export const sampleLightPoint = (style: TreeStyle, index: number, count: number, out: THREE.Vector3) => {
  switch (style) {
    case 'spiral':
      return sampleSpiralLight(index, count, out);
    case 'tiered':
      return sampleTieredLight(index, count, out);
    case 'classic':
      return jitterXZ(sampleOrnamentPoint('classic', out), 0.3);
  }
};

/* ---------- Trạng thái CHAOS ---------- */

/** Điểm ngẫu nhiên trong lớp vỏ cầu có bán kính từ 0.7·radius đến radius, phân bố đều theo hướng. */
export const sampleShellPoint = (radius: number, out = new THREE.Vector3()) =>
  out.randomDirection().multiplyScalar(radius * randomRange(0.7, 1));

/** Dịch ngẫu nhiên trên mặt phẳng XZ trong bán kính `amount`. */
export const jitterXZ = (out: THREE.Vector3, amount: number) => {
  const angle = randomAngle();
  out.x += amount * Math.cos(angle);
  out.z += amount * Math.sin(angle);
  return out;
};
