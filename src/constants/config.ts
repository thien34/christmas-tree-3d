import type { Config, ThemeColors, ThemeType } from '../types';

// Theme presets
export const THEMES: Record<ThemeType, ThemeColors> = {
  christmas: {
    primary: '#004225',      // Xanh ngọc bích - lá cây
    secondary: '#D32F2F',    // Đỏ
    accent: '#FFD700',       // Vàng
    gold: '#FFD700',
    lights: ['#FF0000', '#00FF00', '#FFFF00'],
    giftColors: ['#D32F2F', '#FFD700', '#2E7D32'],
    metallicGiftColors: ['#C41E3A', '#228B22', '#FFD700', '#FF69B4', '#C0C0C0']
  },
  pink: {
    primary: '#FF69B4',      // Hồng đậm - lá cây
    secondary: '#FFB6C1',    // Hồng nhạt
    accent: '#FF1493',       // Deep pink
    gold: '#FFC0CB',         // Pink gold
    lights: ['#FF69B4', '#FFB6C1', '#FF1493', '#FFC0CB'],
    giftColors: ['#FF69B4', '#FFB6C1', '#FF1493'],
    metallicGiftColors: ['#FF69B4', '#FFB6C1', '#FF1493', '#DB7093', '#FFC0CB']
  },
  purple: {
    primary: '#6B21A8',      // Tím đậm - lá cây
    secondary: '#A855F7',    // Tím sáng
    accent: '#E9D5FF',       // Tím nhạt
    gold: '#DDA0DD',         // Plum
    lights: ['#8B5CF6', '#A855F7', '#C084FC', '#E9D5FF'],
    giftColors: ['#6B21A8', '#8B5CF6', '#A855F7'],
    metallicGiftColors: ['#6B21A8', '#8B5CF6', '#A855F7', '#9333EA', '#C084FC']
  },
  blue: {
    primary: '#0284C7',      // Xanh lam đậm - lá cây
    secondary: '#38BDF8',    // Xanh lam sáng
    accent: '#E0F2FE',       // Xanh nhạt
    gold: '#67E8F9',         // Cyan
    lights: ['#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD'],
    giftColors: ['#0284C7', '#0EA5E9', '#38BDF8'],
    metallicGiftColors: ['#0284C7', '#0EA5E9', '#38BDF8', '#0369A1', '#7DD3FC']
  }
};

// Theme order for cycling
export const THEME_ORDER: ThemeType[] = ['christmas', 'pink', 'purple', 'blue'];

export const CONFIG: Config = {
  colors: {
    emerald: '#004225', // Xanh ngọc bích thuần khiết
    gold: '#FFD700',
    silver: '#ECEFF1',
    red: '#D32F2F',
    white: '#FFFFFF', // Trắng thuần khiết
    warmLight: '#FFD54F',
    lights: ['#FF0000', '#00FF00', '#FFFF00'], // Đèn màu
    // Bảng màu viền ảnh Polaroid (tông màu cổ điển nhẹ nhàng)
    borders: ['#FFFAF0', '#F0E68C', '#E6E6FA', '#FFB6C1', '#98FB98', '#FFDAB9'],
    // Màu sắc các phần tử Giáng sinh
    giftColors: ['#D32F2F', '#FFD700', '#2E7D32'],
    // Màu metallic cho hộp quà (đỏ, xanh lá, xanh dương, vàng, hồng, bạc)
    metallicGiftColors: ['#C41E3A', '#228B22', '#FFD700', '#FF69B4', '#C0C0C0']
  },
  counts: {
    foliage: 25000, // Tăng số hạt lá
    ornaments: 50, // Số lượng ảnh trang trí (không còn dùng, giữ lại để tương thích)
    elements: 400, // Số lượng phần tử Giáng sinh
    lights: 400, // Số lượng đèn màu
    gifts: 300 // Hộp quà có nơ
  },
  tree: { height: 26, radius: 11 }, // Tăng kích thước cây thông
  photos: {
    body: [] // Không còn ảnh mặc định
  }
};

/** Thời gian chờ giữa hai lần nhận cùng một cử chỉ, tránh đổi liên tục. */
export const GESTURE_COOLDOWN_MS = {
  thumbUp: 1500,
  fingerCount: 800,
} as const;

/** Độ tin cậy tối thiểu để chấp nhận một cử chỉ từ MediaPipe. */
export const GESTURE_MIN_SCORE = 0.4;

