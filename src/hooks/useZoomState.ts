import { useCallback, useState } from 'react';
import type { HandPosition, ZoomState } from '../types';

/**
 * Trạng thái phóng to ảnh: bật khi người dùng chụm ngón cái + ngón trỏ.
 * Ảnh được chọn một lần lúc bắt đầu chụm, nên chỉ cần vị trí tay tại thời điểm đó.
 */
export const useZoomState = () => {
  const [zoomState, setZoomState] = useState<ZoomState>({ active: false });

  const handlePinch = useCallback((handPosition: HandPosition | null) => {
    setZoomState(handPosition ? { active: true, handPosition } : { active: false });
  }, []);

  return { zoomState, handlePinch };
};
