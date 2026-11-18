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

/** Bán kính đáy và đỉnh của tầng thứ `tier` (kiểu tiered: mỗi tầng là một hình nón cụt). */
const tierRadii = (tier: number) => ({
  bottom: RADIUS * (1 - tier / TIER_COUNT) * 1.1,
  top: RADIUS * (1 - (tier + 0.8) / TIER_COUNT) * 0.7,
});

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
  const { bottom, top } = tierRadii(tier);

  const tInTier = Math.random();
  const radius = THREE.MathUtils.lerp(bottom, top, tInTier);
  return setCylindrical(out, Math.random() * radius, randomAngle(), heightAt((tier + tInTier) / TIER_COUNT));
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
 * Vị trí một món trang trí. Kiểu classic đặt trên bề mặt nón, dày ở gốc và thưa dần lên đỉnh.
 * Các kiểu khác dùng chung phân bố với lá cây.
 */
export const sampleOrnamentPoint = (style: TreeStyle, out: THREE.Vector3) => {
  if (style !== 'classic') return sampleFoliagePoint(style, out);

  const t = Math.random() ** 1.8;
  return setCylindrical(out, coneRadiusAt(t), randomAngle(), heightAt(t));
};

/* ---------- Ảnh: treo bên ngoài mặt cây ---------- */

/** Ảnh chỉ treo trong khoảng chiều cao này (bỏ sát gốc và phần chóp quá hẹp). */
const HANG_RANGE = { bottom: 0.08, top: 0.7 };
/** Bước của dãy R2: các điểm liên tiếp tự rải đều trên mặt phẳng, dù dừng ở phần tử thứ mấy. */
const R2_STEP = { height: 0.7548776662466927, angle: 0.5698402909980532 };

/** Mặt ngoài của cây ở chiều cao `t`: bán kính và độ thu hẹp (bán kính giảm bao nhiêu trên mỗi đơn vị chiều cao). */
const surfaceAt = (style: TreeStyle, t: number) => {
  if (style !== 'tiered') return { radius: coneRadiusAt(t), taper: RADIUS / HEIGHT };

  const tier = Math.min(Math.floor(t * TIER_COUNT), TIER_COUNT - 1);
  const { bottom, top } = tierRadii(tier);
  return {
    radius: THREE.MathUtils.lerp(bottom, top, t * TIER_COUNT - tier),
    taper: (bottom - top) / (HEIGHT / TIER_COUNT),
  };
};

/**
 * Chỗ treo thứ `index` cho một tấm ảnh: nằm cách mặt ngoài của cây một khoảng `clearance` (để không lẫn vào
 * đồ trang trí), mặt hướng ra ngoài và ngả ra sau theo sườn cây. Các chỗ treo rải đều quanh cây và chỉ phụ thuộc
 * `index`, nên thêm ảnh mới không làm xê dịch ảnh cũ.
 */
export const sampleHangingSpot = (style: TreeStyle, index: number, clearance: number) => {
  // Rải đều theo diện tích mặt nón (phía dưới rộng hơn nên được nhiều chỗ hơn)
  const lower = (1 - HANG_RANGE.bottom) ** 2;
  const upper = (1 - HANG_RANGE.top) ** 2;
  const t = 1 - Math.sqrt(lower - ((0.5 + index * R2_STEP.height) % 1) * (lower - upper));
  const theta = ((index * R2_STEP.angle) % 1) * Math.PI * 2;

  const { radius, taper } = surfaceAt(style, t);
  const lean = Math.atan(taper);
  return {
    position: setCylindrical(
      new THREE.Vector3(),
      radius + clearance * Math.cos(lean),
      theta,
      heightAt(t) + clearance * Math.sin(lean),
    ),
    /** Góc quay quanh trục Y để mặt ảnh (trục +Z) hướng ra xa thân cây. */
    facing: Math.PI / 2 - theta,
    /** Góc ngả ra sau so với phương thẳng đứng, bằng độ dốc của sườn cây tại đó. */
    lean,
  };
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
