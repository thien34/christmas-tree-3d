export const CONFIG = {
  tree: { height: 26, radius: 11 },
  counts: {
    foliage: 25_000,
    ornaments: 400,
    lights: 400,
    gifts: 300,
  },
  colors: {
    warmLight: '#FFD54F',
    gold: '#FFD700',
    silver: '#ECEFF1',
    /** Màu viền ảnh Polaroid. */
    photoBorders: ['#FFFAF0', '#F0E68C', '#E6E6FA', '#FFB6C1', '#98FB98', '#FFDAB9'],
  },
} as const;

/** Thời gian chờ giữa hai lần nhận cùng một cử chỉ, tránh đổi liên tục. */
export const GESTURE_COOLDOWN_MS = {
  thumbUp: 1500,
  fingerCount: 800,
} as const;

/** Độ tin cậy tối thiểu để chấp nhận một cử chỉ từ MediaPipe. */
export const GESTURE_MIN_SCORE = 0.4;
