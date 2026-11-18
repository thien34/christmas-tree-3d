/** CHAOS: các phần tử bay tán loạn. FORMED: các phần tử tụ lại thành cây thông. */
export type SceneState = 'CHAOS' | 'FORMED';

export type TreeStyle = 'classic' | 'tiered' | 'spiral';

export type ThemeType = 'christmas' | 'pink' | 'purple' | 'blue';

export interface ThemeColors {
  /** Màu lá cây. */
  primary: string;
  /** Màu ruy băng hộp quà và ngôi sao. */
  gold: string;
  /** Màu đèn nháy. */
  lights: string[];
  /** Màu quả cầu trang trí. */
  ornamentColors: string[];
  /** Màu hộp quà. */
  giftColors: string[];
}

/** Toạ độ màn hình chuẩn hoá 0–1, gốc ở góc trên bên trái. */
export interface HandPosition {
  x: number;
  y: number;
}

export type FingerCount = 1 | 2 | 3;
