import type { HandPosition } from '../types';

/** Một điểm mốc bàn tay do MediaPipe trả về, toạ độ chuẩn hoá 0–1 theo khung hình camera. */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

/** Index các điểm mốc bàn tay của MediaPipe Hands. */
const LANDMARK = { THUMB_TIP: 4, INDEX_TIP: 8 } as const;

/** Khoảng cách ngón cái – ngón trỏ nhỏ hơn ngưỡng này thì tính là đang chụm (pinch). */
const PINCH_DISTANCE = 0.05;

const distance3D = (a: Landmark, b: Landmark) => Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));

/**
 * Nếu ngón cái và ngón trỏ đang chụm, trả về điểm giữa hai đầu ngón
 * (đã lật ngang để khớp với hình ảnh soi gương người dùng nhìn thấy). Ngược lại trả về null.
 */
export const detectPinch = (landmarks: Landmark[]): HandPosition | null => {
  const thumbTip = landmarks[LANDMARK.THUMB_TIP];
  const indexTip = landmarks[LANDMARK.INDEX_TIP];
  if (!thumbTip || !indexTip || distance3D(thumbTip, indexTip) >= PINCH_DISTANCE) return null;

  return {
    x: 1 - (thumbTip.x + indexTip.x) / 2,
    y: (thumbTip.y + indexTip.y) / 2,
  };
};
