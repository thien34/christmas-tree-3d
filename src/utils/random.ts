import * as THREE from 'three';

/** `randomRange(min, max)`: số thực trong [min, max). `randomSpread(spread)`: số thực trong [-spread/2, spread/2). */
export const { randFloat: randomRange, randFloatSpread: randomSpread } = THREE.MathUtils;

/** Lấy ngẫu nhiên một phần tử của mảng. */
export const randomItem = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)];

/** Góc ngẫu nhiên trong [0, 2π). */
export const randomAngle = () => Math.random() * Math.PI * 2;

/** Điểm ngẫu nhiên trong hình lập phương cạnh `size`, tâm ở gốc toạ độ. */
export const randomInCube = (size: number) =>
  new THREE.Vector3(randomSpread(size), randomSpread(size), randomSpread(size));

/** Vector tốc độ quay ngẫu nhiên, mỗi trục trong [-maxSpeed, maxSpeed). */
export const randomRotationSpeed = (maxSpeed: number) =>
  new THREE.Vector3(randomSpread(maxSpeed * 2), randomSpread(maxSpeed * 2), randomSpread(maxSpeed * 2));

/** Góc Euler ngẫu nhiên, mỗi trục trong [0, π). */
export const randomEuler = () =>
  new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
