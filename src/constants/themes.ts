import type { ThemeColors, ThemeType } from '../types';

export const THEMES: Record<ThemeType, ThemeColors> = {
  christmas: {
    primary: '#004225',
    gold: '#FFD700',
    lights: ['#FF0000', '#00FF00', '#FFFF00'],
    ornamentColors: ['#D32F2F', '#FFD700', '#2E7D32'],
    giftColors: ['#C41E3A', '#228B22', '#FFD700', '#FF69B4', '#C0C0C0'],
  },
  pink: {
    primary: '#FF69B4',
    gold: '#FFC0CB',
    lights: ['#FF69B4', '#FFB6C1', '#FF1493', '#FFC0CB'],
    ornamentColors: ['#FF69B4', '#FFB6C1', '#FF1493'],
    giftColors: ['#FF69B4', '#FFB6C1', '#FF1493', '#DB7093', '#FFC0CB'],
  },
  purple: {
    primary: '#6B21A8',
    gold: '#DDA0DD',
    lights: ['#8B5CF6', '#A855F7', '#C084FC', '#E9D5FF'],
    ornamentColors: ['#6B21A8', '#8B5CF6', '#A855F7'],
    giftColors: ['#6B21A8', '#8B5CF6', '#A855F7', '#9333EA', '#C084FC'],
  },
  blue: {
    primary: '#0284C7',
    gold: '#67E8F9',
    lights: ['#0EA5E9', '#38BDF8', '#7DD3FC', '#BAE6FD'],
    ornamentColors: ['#0284C7', '#0EA5E9', '#38BDF8'],
    giftColors: ['#0284C7', '#0EA5E9', '#38BDF8', '#0369A1', '#7DD3FC'],
  },
};

/** Thứ tự chuyển theme khi giơ ngón cái. */
export const THEME_ORDER: readonly ThemeType[] = ['christmas', 'pink', 'purple', 'blue'];

/**
 * Chọn màu trong bảng màu theo một số ngẫu nhiên cố định `seed` (0–1).
 * Giữ nguyên seed cho mỗi phần tử để khi đổi theme, phần tử vẫn giữ "vị trí màu" tương ứng.
 */
export const pickColor = (palette: readonly string[], seed: number) =>
  palette[Math.min(Math.floor(seed * palette.length), palette.length - 1)];
