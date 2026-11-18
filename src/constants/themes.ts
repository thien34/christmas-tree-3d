import type { ThemeColors, ThemeType } from '../types';

/*
 * Mỗi theme: lá một tông chủ đạo; đồ trang trí gồm một màu đậm cùng tông, một màu kim loại và một màu sáng
 * trung tính; đèn ấm hoặc lạnh theo tông đó. Tránh để màu quả cầu trùng màu lá (sẽ chìm vào tán cây).
 */
export const THEMES: Record<ThemeType, ThemeColors> = {
  // Xanh thông, đỏ rượu, vàng đồng, trắng ngà
  christmas: {
    primary: '#1F7A3F',
    gold: '#F2C14E',
    lights: ['#FFE2A6', '#FF6B5A', '#FFC857'],
    ornamentColors: ['#B3202A', '#E3B23C', '#F4EAD5'],
    giftColors: ['#B3202A', '#1E6B3A', '#F4EAD5', '#D9A441'],
  },
  // Hồng phấn, vàng hồng, đỏ mận
  pink: {
    primary: '#C9577E',
    gold: '#F3C2A2',
    lights: ['#FFE8DA', '#FFB5C8', '#FFD9A8'],
    ornamentColors: ['#8E2847', '#EDB79B', '#FFF1E8'],
    giftColors: ['#8E2847', '#F2B8C6', '#FFF1E8', '#E3A587'],
  },
  // Tím thạch anh, vàng sâm panh, bạc
  purple: {
    primary: '#6A45B5',
    gold: '#EBD197',
    lights: ['#FFF0D2', '#D9C4FF', '#F0A6E8'],
    ornamentColors: ['#3F1D6B', '#E2C46F', '#E6E4F2'],
    giftColors: ['#3F1D6B', '#B49CEB', '#E6E4F2', '#D9B85C'],
  },
  // Xanh băng, bạc, xanh hải quân
  blue: {
    primary: '#2F84B8',
    gold: '#E4F2FF',
    lights: ['#F0F8FF', '#8FDBFF', '#5FA9FF'],
    ornamentColors: ['#1D3F7A', '#DCE6F0', '#F6FBFF'],
    giftColors: ['#1D3F7A', '#A9D4F2', '#F6FBFF', '#C9D6E3'],
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
