import * as THREE from 'three';
import { CONFIG } from '../constants/config';

/*
 * Hình dạng cây thông và các hàm lấy mẫu vị trí trên cây.
 * Toạ độ cục bộ: trục Y hướng lên, gốc tán cây ở y = -height/2, đỉnh ở y = +height/2.
 * `t` là chiều cao chuẩn hoá (0 = gốc tán, 1 = đỉnh), `theta` là góc quanh thân cây.
 * Cây được dựng từ các cành; lá, quả cầu, đèn và ảnh đều bám vào cành.
 */

const { height: HEIGHT, radius: RADIUS, trunkHeight: TRUNK_HEIGHT } = CONFIG.tree;
/** Góc vàng: xoay mỗi phần tử kế tiếp một góc này thì chúng tự rải đều quanh vòng tròn. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2;

/** Độ cao mặt đất (chân thân cây). */
export const GROUND_Y = -HEIGHT / 2 - TRUNK_HEIGHT;

const heightAt = (t: number) => (t - 0.5) * HEIGHT;

/** Số ngẫu nhiên 0–1 cố định theo `n`: cùng một cành thì lần nào cũng ra cùng giá trị. */
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------- Cành cây ---------- */

const BRANCH_COUNT = 230;
/** Cành dài nhất có thể có (tính theo bán kính cây), dùng để ưu tiên chọn cành dài vì chúng mang nhiều lá hơn. */
const MAX_REACH = 1.15;

interface Branch {
  /** Chiều cao chỗ cành mọc ra từ thân. */
  t: number;
  /** Hướng cành chĩa ra. */
  theta: number;
  length: number;
}

/**
 * Cành thứ `index`: cành rải đều từ gốc tới ngọn và xoay quanh thân theo góc vàng (không cành nào nằm đúng
 * trên cành nào), dài ngắn khác nhau một chút, tạo thành một tán nón đầy đặn.
 */
const branchAt = (index: number): Branch => {
  const t = 0.02 + 0.96 * (1 - (1 - (index + 0.5) / BRANCH_COUNT) ** 0.85);
  return { t, theta: index * GOLDEN_ANGLE, length: RADIUS * (1 - t) * (0.85 + 0.3 * hash(index)) };
};

/** Chọn ngẫu nhiên một cành, xác suất tỉ lệ với diện tích tán của cành đó. */
const randomBranch = () => {
  for (;;) {
    const index = Math.floor(Math.random() * BRANCH_COUNT);
    const branch = branchAt(index);
    if (Math.random() < (branch.length / (RADIUS * MAX_REACH)) ** 2) return { index, ...branch };
  }
};

/**
 * Đặt `out` vào một điểm trên cành: cách thân `along` (0 = sát thân, 1 = ngọn cành) và lệch ngang `sideways`.
 * Cành hơi rủ xuống rồi cong lên ở ngọn, giống cành thông thật.
 */
const setOnBranch = (out: THREE.Vector3, { t, theta, length }: Branch, along: number, sideways: number) => {
  const reach = length * along;
  const y = heightAt(t) + length * (-0.32 * along + 0.24 * along * along) - Math.abs(sideways) * 0.15;
  return out.set(
    reach * Math.cos(theta) - sideways * Math.sin(theta),
    y,
    reach * Math.sin(theta) + sideways * Math.cos(theta),
  );
};

/* ---------- Lá cây ---------- */

/** Mỗi cành có chừng này cặp nhánh con chĩa chéo ra hai bên như xương cá. */
const TWIGS_PER_BRANCH = 10;

/**
 * Vị trí một lá kim: lá mọc dọc theo các nhánh con của một cành, nên tán cây có cành, có khe hở như cây thật.
 * Trả về độ sáng 0–1 của lá: đầu cành, đầu nhánh thì sáng; càng gần thân càng tối.
 */
export const sampleFoliagePoint = (out: THREE.Vector3) => {
  const branch = randomBranch();
  // Gốc của nhánh con trên cành, và vị trí của lá dọc theo nhánh con đó
  const twigBase = (Math.floor(Math.random() * TWIGS_PER_BRANCH) + Math.random() * 0.3) / TWIGS_PER_BRANCH;
  const alongTwig = Math.random();
  // Nhánh con dài nhất ở gần thân rồi ngắn dần về ngọn cành, tạo thành hình quạt nhọn đầu
  const twigLength = branch.length * 0.36 * (1 - twigBase) * Math.min(1, 0.25 + twigBase * 3);
  const side = Math.random() < 0.5 ? -1 : 1;
  const along = twigBase + alongTwig * 0.2;

  setOnBranch(out, branch, along, side * alongTwig * twigLength);
  out.x += (Math.random() - 0.5) * 0.25;
  out.y += (Math.random() - 0.5) * 0.3;
  out.z += (Math.random() - 0.5) * 0.25;
  const exposure = 0.2 + 0.8 * Math.min(1, 0.6 * along + 0.45 * alongTwig);
  return Math.min(1, exposure * (0.75 + 0.45 * hash(branch.index * 7.31)));
};

/* ---------- Quả cầu và đèn ---------- */

/** Vị trí một quả cầu: treo lủng lẳng dưới phần ngọn của một cành. */
export const sampleOrnamentPoint = (out = new THREE.Vector3()) => {
  const branch = randomBranch();
  const along = 0.7 + 0.3 * Math.random();
  setOnBranch(out, branch, along, (Math.random() - 0.5) * 0.2 * branch.length * (1 - along));
  out.y -= 0.45;
  return out;
};

/** Vị trí một bóng đèn: nằm lẫn trong tán lá của một cành. */
export const sampleLightPoint = (out = new THREE.Vector3()) => {
  const branch = randomBranch();
  const along = 0.35 + 0.65 * Math.random();
  setOnBranch(out, branch, along, (Math.random() - 0.5) * 0.5 * branch.length * (1 - along));
  out.y += 0.15;
  return out;
};

/* ---------- Hộp quà ---------- */

/** Hộp quà xếp trên mặt đất quanh gốc cây, trong vành khuyên có bán kính (tính theo bán kính cây) như sau. */
const GIFT_RING = { inner: 0.55, outer: 1.5 };

/** Chỗ đặt hộp quà thứ `index` trong `count` hộp (xếp kiểu hoa hướng dương nên không chồng lên nhau). */
export const sampleGiftSpot = (index: number, count: number, out = new THREE.Vector3()) => {
  const inner = GIFT_RING.inner ** 2;
  const radius = RADIUS * Math.sqrt(inner + ((index + 0.5) / count) * (GIFT_RING.outer ** 2 - inner));
  const theta = index * GOLDEN_ANGLE;
  return out.set(radius * Math.cos(theta), GROUND_Y, radius * Math.sin(theta));
};

/* ---------- Ảnh: treo ở ngọn cành ---------- */

/**
 * Ảnh chỉ treo ở các cành từ HANGING_BRANCHES.first tới trước HANGING_BRANCHES.end: bỏ vài cành sát đất
 * (ảnh sẽ chạm nền, lẫn vào hộp quà) và các cành gần chóp (quá ngắn).
 */
const HANGING_BRANCHES = { first: Math.floor(BRANCH_COUNT * 0.06), end: Math.floor(BRANCH_COUNT * 0.7) };
/** Ảnh hơi ngả ra sau so với phương thẳng đứng (rad). */
const HANGING_LEAN = 0.3;

/**
 * Chỗ treo thứ `index` cho một tấm ảnh: ngay ngoài ngọn một cành, cách ngọn cành `clearance`, mặt hướng ra ngoài.
 * Chỗ treo chỉ phụ thuộc `index` (dãy tỉ lệ vàng rải các ảnh đều theo chiều cao và quanh thân),
 * nên thêm ảnh mới không làm xê dịch ảnh cũ.
 */
export const sampleHangingSpot = (index: number, clearance: number) => {
  const { first, end } = HANGING_BRANCHES;
  const branch = branchAt(first + Math.floor(((0.5 + index * GOLDEN_RATIO) % 1) * (end - first)));
  const position = setOnBranch(new THREE.Vector3(), branch, 1, 0);
  position.x += clearance * Math.cos(branch.theta);
  position.z += clearance * Math.sin(branch.theta);
  return {
    position,
    /** Góc quay quanh trục Y để mặt ảnh (trục +Z) hướng ra xa thân cây. */
    facing: Math.PI / 2 - branch.theta,
    lean: HANGING_LEAN,
  };
};

/* ---------- Trạng thái CHAOS ---------- */

/** Điểm ngẫu nhiên trong lớp vỏ cầu có bán kính từ 0.7·radius đến radius, phân bố đều theo hướng. */
export const sampleShellPoint = (radius: number, out = new THREE.Vector3()) =>
  out.randomDirection().multiplyScalar(radius * (0.7 + 0.3 * Math.random()));
