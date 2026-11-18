import { useCallback, useState } from 'react';
import { THEME_ORDER, THEMES } from '../constants/config';
import type { ThemeType } from '../types';

export const useTheme = () => {
  const [theme, setTheme] = useState<ThemeType>('christmas');

  const cycleTheme = useCallback(() => {
    setTheme((prev) => THEME_ORDER[(THEME_ORDER.indexOf(prev) + 1) % THEME_ORDER.length]);
  }, []);

  return { themeColors: THEMES[theme], cycleTheme };
};
