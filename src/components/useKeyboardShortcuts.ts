import { useEffect } from 'react';
import { launchFireworks, spinTree, toggleMusic } from '../store';

/** Phím tắt cho người không có (hoặc không bật) camera: ← → xoay cây, F bắn pháo hoa, M bật/tắt nhạc. */
export const useKeyboardShortcuts = () => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Không giành phím khi đang gõ chữ hoặc đang dùng tổ hợp phím của trình duyệt
      // (target có thể không phải phần tử, ví dụ sự kiện phát thẳng lên window, nên phải kiểm tra trước khi gọi closest)
      const typing = event.target instanceof Element && event.target.closest('input, textarea, [contenteditable]');
      if (event.ctrlKey || event.metaKey || event.altKey || typing) return;

      switch (event.key) {
        case 'ArrowRight':
          spinTree(1);
          break;
        case 'ArrowLeft':
          spinTree(-1);
          break;
        case 'f':
        case 'F':
          launchFireworks();
          break;
        case 'm':
        case 'M':
          if (!event.repeat) toggleMusic();
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);
};
