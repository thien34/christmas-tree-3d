import { create } from 'zustand';
import { THEME_ORDER, THEMES } from './constants/themes';
import type { HandPosition, SceneState, ThemeType, TreeStyle } from './types';

interface AppState {
  sceneState: SceneState;
  theme: ThemeType;
  treeStyle: TreeStyle;
  /** Vị trí tay lúc bắt đầu chụm ngón cái + ngón trỏ (ảnh gần đó nhất được phóng to); null khi không chụm. */
  pinch: HandPosition | null;
  /** Ảnh người dùng thêm vào, dưới dạng object URL. */
  photoUrls: string[];
  debugMode: boolean;
  /** Dòng trạng thái trên cùng; bắt đầu bằng "ERROR" thì hiện màu lỗi. */
  status: string;
}

/**
 * Trạng thái dùng chung của cả app. Component đọc bằng `useStore(selector)`;
 * code chạy mỗi khung hình (useFrame, nhận diện tay) đọc bằng `useStore.getState()` để không gây re-render.
 */
export const useStore = create<AppState>(() => ({
  sceneState: 'CHAOS',
  theme: 'christmas',
  treeStyle: 'classic',
  pinch: null,
  photoUrls: [],
  debugMode: false,
  status: 'INITIALIZING...',
}));

/** Bảng màu của theme đang chọn. */
export const useThemeColors = () => useStore((s) => THEMES[s.theme]);

export const setStatus = (status: string) => useStore.setState({ status });

export const toggleSceneState = () =>
  useStore.setState((s) => ({ sceneState: s.sceneState === 'CHAOS' ? 'FORMED' : 'CHAOS' }));

export const toggleDebugMode = () => useStore.setState((s) => ({ debugMode: !s.debugMode }));

export const cycleTheme = () =>
  useStore.setState((s) => ({ theme: THEME_ORDER[(THEME_ORDER.indexOf(s.theme) + 1) % THEME_ORDER.length] }));

/** Thêm các file ảnh; file không phải ảnh bị bỏ qua và báo lên dòng trạng thái. */
export const addPhotos = (files: Iterable<File>) => {
  const all = [...files];
  const urls = all.filter((file) => file.type.startsWith('image/')).map((file) => URL.createObjectURL(file));
  const skipped = all.length - urls.length;

  useStore.setState((s) => ({ photoUrls: [...s.photoUrls, ...urls] }));
  if (skipped > 0) setStatus(`ERROR: ${skipped} file(s) skipped, not an image`);
};
