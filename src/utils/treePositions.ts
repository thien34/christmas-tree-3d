import * as THREE from 'three';
import { CONFIG } from '../constants/config';
import type { TreeStyle } from '../types';
import { randomAngle } from './random';

/*
 * Hình dạng cây thông và các hàm lấy mẫu vị trí trên cây.
 * Toạ độ cục bộ: trục Y hướng lên, gốc tán cây ở y = -height/2, đỉnh ở y = +height/2.
 * `t` là chiều cao chuẩn hoá (0 = gốc tán, 1 = đỉnh), `theta` là góc quanh thân cây.
 */

const { height: HEIGHT, radius: RADIUS, trunkHeight: TRUNK_HEIGHT } = CONFIG.tree;
const TAU = Math.PI * 2;
/** Góc vàng: xoay mỗi phần tử kế tiếp một góc này thì chúng tự rải đều quanh vòng tròn. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** Độ cao mặt đất (chân thân cây). */
export const GROUND_Y = -HEIGHT / 2 - TRUNK_HEIGHT;

/**
 * Mỗi kiểu cây là một hình nón gồm nhiều tầng tán: mỗi tầng xoè rộng ở mép dưới rồi thu dần vào ở phía trên.
 * - layers: số tầng tán
 * - flare: tán xoè mạnh hay nhẹ (0 = nón trơn)
 * - twist: 0 thì các tầng nằm ngang; 1 thì chúng nối nhau thành một dải xoắn ốc chạy quanh thân
 */
const SHAPES: Record<TreeStyle, { layers: number; flare: number; twist: number }> = {
  classic: { layers: 9, flare: 0.3, twist: 0 },
  tiered: { layers: 4, flare: 0.65, twist: 0 },
  spiral: { layers: 5, flare: 0.6, twist: 1 },
};

const heightAt = (t: number) => (t - 0.5) * HEIGHT;

/** Chiều cao ngẫu nhiên, rải đều theo diện tích mặt nón (phía dưới rộng hơn nên được nhiều hơn). */
const randomHeight = () => 1 - Math.sqrt(Math.random());

/** Vị trí trong một tầng tán: 0 = mép dưới (chỗ xoè rộng nhất), tăng dần tới 1 = sát tầng phía trên. */
const boughPhase = (style: TreeStyle, t: number, theta: number) => {
  const { layers, twist } = SHAPES[style];
  const phase = t * layers + (twist * theta) / TAU;
  return phase - Math.floor(phase);
};

/** Bán kính mặt ngoài của cây tại chiều cao `t`, hướng `theta`. */
const surfaceRadius = (style: TreeStyle, t: number, theta: number) =>
  RADIUS * (1 - t) * (1 + SHAPES[style].flare * (0.5 - boughPhase(style, t, theta)));

/** Đặt `out` theo toạ độ trụ (bán kính, góc, độ cao). */
const setCylindrical = (out: THREE.Vector3, radius: number, theta: number, y: number) =>
  out.set(radius * Math.cos(theta), y, radius * Math.sin(theta));

/* ---------- Lá cây ---------- */

/**
 * Vị trí một hạt lá: nằm trong lớp vỏ ngoài của tán, dồn về phía mặt ngoài (lá ở sâu bên trong không ai thấy).
 * Trả về độ sáng 0–1 của hạt: đầu cành lộ ra ngoài thì sáng, chỗ khuất dưới tầng tán phía trên thì tối.
 */
export const sampleFoliagePoint = (style: TreeStyle, out: THREE.Vector3) => {
  const t = randomHeight();
  const theta = randomAngle();
  const depth = Math.random() ** 2; // 0 = mặt ngoài, 1 = sâu nhất
  setCylindrical(out, surfaceRadius(style, t, theta) * (1 - depth * 0.45), theta, heightAt(t));
  return (1 - depth) * (1 - 0.7 * boughPhase(style, t, theta));
};

/* ---------- Quả cầu ---------- */

/** Vị trí một quả cầu: trên mặt ngoài của tán, rải đều theo diện tích, chừa lại phần chóp. */
export const sampleOrnamentPoint = (style: TreeStyle, out: THREE.Vector3) => {
  const t = randomHeight() * 0.92;
  const theta = randomAngle();
  return setCylindrical(out, surfaceRadius(style, t, theta), theta, heightAt(t));
};

/* ---------- Dây đèn ---------- */

/** Dây đèn chạy sát mép dưới của tầng tán, nơi tán xoè rộng nhất. */
const LIGHT_PHASE = 0.06;

/**
 * Vị trí bóng đèn thứ `index` trong tổng số `count` bóng: đèn viền theo mép từng tầng tán
 * (kiểu spiral: một dây liên tục quấn theo dải xoắn).
 */
export const sampleLightPoint = (style: TreeStyle, index: number, count: number, out: THREE.Vector3) => {
  const { layers, twist } = SHAPES[style];
  // Rải đều theo chiều dài dây: vòng dưới dài hơn nên nhiều bóng hơn
  let t = (1 - Math.sqrt(1 - (index + 0.5) / count)) * 0.96;
  let theta = index * GOLDEN_ANGLE;
  if (twist) theta = (TAU * (LIGHT_PHASE - t * layers)) / twist;
  else t = (Math.floor(t * layers) + LIGHT_PHASE) / layers;

  return setCylindrical(out, surfaceRadius(style, t, theta) + 0.15, theta, heightAt(t));
};

/* ---------- Hộp quà ---------- */

/** Hộp quà xếp trên mặt đất quanh gốc cây, trong vành khuyên có bán kính (tính theo bán kính cây) như sau. */
const GIFT_RING = { inner: 0.55, outer: 1.5 };

/** Chỗ đặt hộp quà thứ `index` trong `count` hộp (xếp kiểu hoa hướng dương nên không chồng lên nhau). */
export const sampleGiftSpot = (index: number, count: number, out = new THREE.Vector3()) => {
  const inner = GIFT_RING.inner ** 2;
  const radius = RADIUS * Math.sqrt(inner + ((index + 0.5) / count) * (GIFT_RING.outer ** 2 - inner));
  return setCylindrical(out, radius, index * GOLDEN_ANGLE, GROUND_Y);
};

/* ---------- Ảnh: treo bên ngoài mặt cây ---------- */

/** Ảnh chỉ treo trong khoảng chiều cao này (bỏ sát gốc và phần chóp quá hẹp). */
const HANG_RANGE = { bottom: 0.08, top: 0.7 };
/** Ảnh treo ở nửa ngoài của tầng tán để không bị tầng phía trên che. */
const HANG_PHASE = { from: 0.1, span: 0.35 };
/** Ảnh ngả ra sau theo sườn cây nhưng không quá góc này (rad). */
const MAX_LEAN = 0.6;
/** Bước của dãy R2: các điểm liên tiếp tự rải đều trên mặt phẳng, dù dừng ở phần tử thứ mấy. */
const R2_STEP = { height: 0.7548776662466927, angle: 0.5698402909980532 };

/**
 * Chỗ treo thứ `index` cho một tấm ảnh: nằm cách mặt ngoài của cây một khoảng `clearance` (để không lẫn vào
 * đồ trang trí), mặt hướng ra ngoài và ngả ra sau theo sườn cây. Các chỗ treo rải đều quanh cây và chỉ phụ thuộc
 * `index`, nên thêm ảnh mới không làm xê dịch ảnh cũ.
 */
export const sampleHangingSpot = (style: TreeStyle, index: number, clearance: number) => {
  const { layers, flare } = SHAPES[style];
  // Rải đều theo diện tích mặt nón (phía dưới rộng hơn nên được nhiều chỗ hơn)
  const lower = (1 - HANG_RANGE.bottom) ** 2;
  const upper = (1 - HANG_RANGE.top) ** 2;
  const theta = ((index * R2_STEP.angle) % 1) * TAU;
  let t = 1 - Math.sqrt(lower - ((0.5 + index * R2_STEP.height) % 1) * (lower - upper));
  // Dời lên/xuống một chút trong cùng tầng tán để ảnh nằm ở nửa ngoài của tầng
  const phase = boughPhase(style, t, theta);
  t += (HANG_PHASE.from + HANG_PHASE.span * phase - phase) / layers;

  const radius = surfaceRadius(style, t, theta);
  // Độ dốc của sườn cây tại đó: bán kính giảm bao nhiêu trên mỗi đơn vị chiều cao
  const taper = (radius / (1 - t) + RADIUS * (1 - t) * flare * layers) / HEIGHT;
  const lean = Math.min(Math.atan(taper), MAX_LEAN);
  return {
    position: setCylindrical(
      new THREE.Vector3(),
      radius + clearance * Math.cos(lean),
      theta,
      heightAt(t) + clearance * Math.sin(lean),
    ),
    /** Góc quay quanh trục Y để mặt ảnh (trục +Z) hướng ra xa thân cây. */
    facing: Math.PI / 2 - theta,
    /** Góc ngả ra sau so với phương thẳng đứng. */
    lean,
  };
};

/* ---------- Trạng thái CHAOS ---------- */

/** Điểm ngẫu nhiên trong lớp vỏ cầu có bán kính từ 0.7·radius đến radius, phân bố đều theo hướng. */
export const sampleShellPoint = (radius: number, out = new THREE.Vector3()) =>
  out.randomDirection().multiplyScalar(radius * (0.7 + 0.3 * Math.random()));
