export const CONFIG = {
  /** Kích thước tán cây; thân cây cao `trunkHeight` nối từ mặt đất lên gốc tán. */
  tree: { height: 26, radius: 11, trunkHeight: 2.5 },
  counts: {
    foliage: 70_000,
    ornaments: 70,
    lights: 220,
    gifts: 34,
  },
  colors: {
    warmLight: '#FFD54F',
    gold: '#FFD700',
    silver: '#ECEFF1',
    /** Màu viền ảnh Polaroid. */
    photoBorders: ['#FFFAF0', '#F0E68C', '#E6E6FA', '#FFB6C1', '#98FB98', '#FFDAB9'],
  },
} as const;

/** Sau một lần giơ ngón cái (đổi theme), phải chờ chừng này mới nhận lần kế tiếp, tránh đổi liên tục. */
export const THUMB_UP_COOLDOWN_MS = 1500;

/** Giữ ✌️ thì cứ chừng này lại bắn một loạt pháo hoa. */
export const FIREWORKS_COOLDOWN_MS = 1500;

/** Độ tin cậy tối thiểu để chấp nhận một cử chỉ từ MediaPipe. */
export const GESTURE_MIN_SCORE = 0.4;
