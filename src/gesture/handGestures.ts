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

/* ---------- ✌️ (dự phòng khi MediaPipe không nhận ra "Victory") ---------- */

const WRIST = 0;
/** Khớp giữa (PIP) và đầu ngón của từng ngón. */
const FINGER = {
  index: { pip: 6, tip: 8 },
  middle: { pip: 10, tip: 12 },
  ring: { pip: 14, tip: 16 },
  pinky: { pip: 18, tip: 20 },
} as const;

/**
 * Tỉ lệ (khoảng cách cổ tay → đầu ngón) / (cổ tay → khớp giữa): ngón duỗi thì đầu ngón xa cổ tay hơn hẳn khớp giữa
 * (~1.3–1.5), ngón gập thì đầu ngón quặp về gần lòng bàn tay (< 1). Không phụ thuộc tay đang nghiêng hay xoay.
 */
const fingerReach = (landmarks: Landmark[], { pip, tip }: { pip: number; tip: number }) =>
  distance3D(landmarks[WRIST], landmarks[tip]) / Math.max(distance3D(landmarks[WRIST], landmarks[pip]), 1e-6);

const EXTENDED_REACH = 1.15;
const FOLDED_REACH = 1.0;

/** Ngón trỏ và ngón giữa duỗi, ngón áp út và ngón út gập (ngón cái tuỳ ý). */
export const isVictoryPose = (landmarks: Landmark[]) =>
  landmarks.length > FINGER.pinky.tip &&
  fingerReach(landmarks, FINGER.index) > EXTENDED_REACH &&
  fingerReach(landmarks, FINGER.middle) > EXTENDED_REACH &&
  fingerReach(landmarks, FINGER.ring) < FOLDED_REACH &&
  fingerReach(landmarks, FINGER.pinky) < FOLDED_REACH;
