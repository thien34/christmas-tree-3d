import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const CORNERS: readonly Corner[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const STORAGE_KEY = 'camera-dock-corner';
/** Thời gian trượt về góc sau khi thả (khớp với transition trong index.css). */
const SNAP_MS = 250;
/** Khoảng cách tới mép màn hình. */
const MARGIN = 16;
/** Ở góc dưới bên phải chừa chỗ cho thanh nút (thêm ảnh, debug). */
const TOOLBAR_CLEARANCE = 72;

interface Point {
  x: number;
  y: number;
}

/** localStorage có thể bị chặn (chế độ riêng tư, chặn cookie) nên mọi lần đọc/ghi đều phải bọc try/catch. */
const loadCorner = (fallback: Corner): Corner => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return CORNERS.includes(saved as Corner) ? (saved as Corner) : fallback;
  } catch {
    return fallback;
  }
};

const saveCorner = (corner: Corner) => {
  try {
    localStorage.setItem(STORAGE_KEY, corner);
  } catch {
    // Không lưu được thì lần sau về góc mặc định, không ảnh hưởng gì khác
  }
};

/** Toạ độ góc trên bên trái của khung khi nằm ở `corner`. */
const cornerPosition = (corner: Corner, width: number, height: number): Point => {
  const right = corner.endsWith('right');
  const bottom = corner.startsWith('bottom');
  const bottomMargin = bottom && right ? TOOLBAR_CLEARANCE : MARGIN;
  return {
    x: right ? window.innerWidth - width - MARGIN : MARGIN,
    y: bottom ? window.innerHeight - height - bottomMargin : MARGIN,
  };
};

/** Góc gần nhất với tâm khung: so tâm khung với tâm màn hình. */
const nearestCorner = (x: number, y: number, width: number, height: number): Corner => {
  const vertical = y + height / 2 < window.innerHeight / 2 ? 'top' : 'bottom';
  const horizontal = x + width / 2 < window.innerWidth / 2 ? 'left' : 'right';
  return `${vertical}-${horizontal}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Khung nổi kéo thả được: trong lúc kéo thì đi theo con trỏ, thả ra thì trượt về góc màn hình gần nhất.
 * Góc đã chọn được nhớ qua các lần mở trang. Trả về ref cho phần tử, style vị trí và các handler con trỏ.
 */
export const useCornerDock = <T extends HTMLElement>(defaultCorner: Corner = 'top-right') => {
  const ref = useRef<T>(null);
  const [corner, setCorner] = useState(() => loadCorner(defaultCorner));
  /** Vị trí trong lúc đang kéo; null khi khung đang nằm ở một góc. */
  const [dragPos, setDragPos] = useState<Point | null>(null);
  /**
   * Đang trượt về góc sau khi thả. Chỉ lúc này mới bật transition; nếu bật luôn thì lúc hiện khung (tắt → bật debug)
   * hay đổi cỡ cửa sổ, khung sẽ trượt chéo qua màn hình thay vì xuất hiện ngay tại góc.
   */
  const [isSnapping, setIsSnapping] = useState(false);
  /** Kích thước khung, đo lại khi khung hoặc cửa sổ đổi kích thước. */
  const [size, setSize] = useState({ width: 0, height: 0 });
  /** Khoảng lệch giữa con trỏ và góc trên bên trái khung lúc bắt đầu kéo. */
  const grabOffset = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setSize({ width: element.offsetWidth, height: element.offsetHeight });
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    // Cửa sổ đổi kích thước thì toạ độ các góc cũng đổi theo
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<T>) => {
    const element = ref.current;
    if (!element || event.button !== 0) return;
    const rect = element.getBoundingClientRect();
    grabOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    element.setPointerCapture(event.pointerId);
    setDragPos({ x: rect.left, y: rect.top });
    event.preventDefault(); // không bôi đen chữ, không kéo ảnh của trình duyệt
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<T>) => {
      if (!dragPos) return;
      setDragPos({
        x: clamp(event.clientX - grabOffset.current.x, 0, window.innerWidth - size.width),
        y: clamp(event.clientY - grabOffset.current.y, 0, window.innerHeight - size.height),
      });
    },
    [dragPos, size],
  );

  const onPointerUp = useCallback(() => {
    if (!dragPos) return;
    const next = nearestCorner(dragPos.x, dragPos.y, size.width, size.height);
    setCorner(next);
    saveCorner(next);
    setDragPos(null);
    setIsSnapping(true);
  }, [dragPos, size]);

  useEffect(() => {
    if (!isSnapping) return;
    const timer = setTimeout(() => setIsSnapping(false), SNAP_MS);
    return () => clearTimeout(timer);
  }, [isSnapping]);

  const position = dragPos ?? cornerPosition(corner, size.width, size.height);
  const style: CSSProperties = { left: position.x, top: position.y };

  return {
    ref,
    style,
    isDragging: dragPos !== null,
    isSnapping,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
};
