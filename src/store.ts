import { create } from 'zustand';
import { startMusic, stopMusic } from './audio/music';
import { THEME_ORDER, THEMES } from './constants/themes';
import type { HandPosition, SceneState, ThemeType } from './types';

interface AppState {
  sceneState: SceneState;
  theme: ThemeType;
  /** Vị trí tay lúc bắt đầu chụm ngón cái + ngón trỏ (ảnh gần đó nhất được phóng to); null khi không chụm. */
  pinch: HandPosition | null;
  /** Ảnh người dùng thêm vào, dưới dạng object URL. */
  photoUrls: string[];
  debugMode: boolean;
  musicOn: boolean;
  /**
   * Yêu cầu xoay cây (phím mũi tên): `direction` 1 = sang phải, -1 = sang trái. Mỗi yêu cầu là một object mới,
   * cảnh 3D so tham chiếu để biết có yêu cầu mới, nên nhấn hai lần liền cùng hướng vẫn tính hai lần.
   */
  spinRequest: { direction: 1 | -1 } | null;
  /** Số lần đã yêu cầu bắn pháo hoa; cảnh 3D thấy số này tăng thì bắn một loạt. */
  fireworksRequests: number;
  /** Dòng trạng thái trên cùng; bắt đầu bằng "ERROR: " thì hiện kiểu lỗi (tiền tố này không hiện ra). */
  status: string;
}

/**
 * Trạng thái dùng chung của cả app. Component đọc bằng `useStore(selector)`;
 * code chạy mỗi khung hình (useFrame, nhận diện tay) đọc bằng `useStore.getState()` để không gây re-render.
 */
export const useStore = create<AppState>(() => ({
  sceneState: 'CHAOS',
  theme: 'christmas',
  pinch: null,
  photoUrls: [],
  debugMode: false,
  musicOn: false,
  spinRequest: null,
  fireworksRequests: 0,
  status: 'Starting…',
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

export const spinTree = (direction: 1 | -1) => useStore.setState({ spinRequest: { direction } });

export const launchFireworks = () => useStore.setState((s) => ({ fireworksRequests: s.fireworksRequests + 1 }));

/** Bật/tắt nhạc nền. Phải gọi từ một thao tác của người dùng (nhấn nút, phím) vì trình duyệt chặn tự phát nhạc. */
export const toggleMusic = () => {
  if (useStore.getState().musicOn) {
    stopMusic();
    useStore.setState({ musicOn: false });
    return;
  }
  useStore.setState({ musicOn: true });
  startMusic().catch((error: unknown) => {
    console.error('Music error:', error);
    useStore.setState({ musicOn: false });
    setStatus('ERROR: Could not play music');
  });
};
