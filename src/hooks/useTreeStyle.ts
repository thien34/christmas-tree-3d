import { useCallback, useState } from 'react';
import type { FingerCount, TreeStyle } from '../types';

/** 1 ngón: classic, 2 ngón: tiered, 3 ngón: spiral. */
const STYLE_BY_FINGER_COUNT: Record<FingerCount, TreeStyle> = {
  1: 'classic',
  2: 'tiered',
  3: 'spiral',
};

export const useTreeStyle = () => {
  const [treeStyle, setTreeStyle] = useState<TreeStyle>('classic');

  const setStyleByFingerCount = useCallback((count: FingerCount) => {
    setTreeStyle(STYLE_BY_FINGER_COUNT[count]);
  }, []);

  return { treeStyle, setStyleByFingerCount };
};
