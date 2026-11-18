import type { FingerCount, HandPosition } from '../types';

/** Một điểm mốc bàn tay do MediaPipe trả về, toạ độ chuẩn hoá 0–1 theo khung hình camera. */
export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

/** Index các điểm mốc bàn tay của MediaPipe Hands. */
const LANDMARK = {
  THUMB_MCP: 2,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_TIP: 20,
} as const;

/** Khoảng cách ngón cái – ngón trỏ nhỏ hơn ngưỡng này thì tính là đang chụm (pinch). */
const PINCH_DISTANCE = 0.05;
/** Đầu ngón phải cao hơn khớp gốc ít nhất chừng này mới tính là duỗi. */
const FINGER_EXTENDED_MARGIN = 0.05;
const THUMB_EXTENDED_MARGIN = 0.08;

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

const isFingerExtended = (landmarks: Landmark[], tip: number, mcp: number) =>
  landmarks[tip].y < landmarks[mcp].y - FINGER_EXTENDED_MARGIN;

/** Ba ngón trỏ + giữa + áp út duỗi, ngón cái và ngón út gập. */
const isThreeFingers = (landmarks: Landmark[]) => {
  const thumbExtended =
    Math.abs(landmarks[LANDMARK.THUMB_TIP].x - landmarks[LANDMARK.THUMB_MCP].x) > THUMB_EXTENDED_MARGIN;

  return (
    isFingerExtended(landmarks, LANDMARK.INDEX_TIP, LANDMARK.INDEX_MCP) &&
    isFingerExtended(landmarks, LANDMARK.MIDDLE_TIP, LANDMARK.MIDDLE_MCP) &&
    isFingerExtended(landmarks, LANDMARK.RING_TIP, LANDMARK.RING_MCP) &&
    !isFingerExtended(landmarks, LANDMARK.PINKY_TIP, LANDMARK.PINKY_MCP) &&
    !thumbExtended
  );
};

/** Đếm số ngón (1–3) dùng để chọn kiểu cây; null nếu không khớp. */
export const countFingers = (gestureName: string, landmarks: Landmark[] | undefined): FingerCount | null => {
  switch (gestureName) {
    case 'Pointing_Up':
      return 1;
    case 'Victory':
      return 2;
    case 'ILoveYou': // cái + trỏ + út, dùng làm cử chỉ thay thế cho 3 ngón
      return 3;
    default:
      return landmarks && landmarks.length > LANDMARK.PINKY_TIP && isThreeFingers(landmarks) ? 3 : null;
  }
};
