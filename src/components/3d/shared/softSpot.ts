import * as THREE from 'three';

/**
 * Texture một đốm tròn mềm: đặc ở tâm, mờ dần ra mép (alpha). Dùng làm bóng đổ giả dưới hộp quà, gốc cây.
 * Tạo một lần, dùng chung.
 */
export const SOFT_SPOT_TEXTURE = (() => {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
})();
