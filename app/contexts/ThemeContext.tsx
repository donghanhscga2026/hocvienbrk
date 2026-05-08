'use client';

import { useEffect } from 'react';
import { ThemeId, getThemeById, generateThemeCSS, presetThemes, isDarkTheme } from './theme-config';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedTheme = (localStorage.getItem('site-theme') as ThemeId) || 'default';
    const savedCustom = localStorage.getItem('site-custom-colors');
    
    // Lấy theme colors
    let themeColors = presetThemes[0].colors; // Royal Empire là default
    let themeId: ThemeId = 'default';
    
    if (savedTheme === 'custom' && savedCustom) {
      themeColors = JSON.parse(savedCustom);
      themeId = 'custom';
    } else if (savedTheme !== 'default') {
      const theme = getThemeById(savedTheme);
      themeColors = theme.colors;
      themeId = savedTheme;
    }
    
    const isDark = isDarkTheme(themeId);
    
    // Inject CSS vào <head>
    let styleEl = document.getElementById('theme-base-css');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-base-css';
      document.head.appendChild(styleEl);
    }
    
    styleEl.textContent = generateThemeCSS(themeColors, isDark);
    document.documentElement.setAttribute('data-theme', themeId);
  }, []);

  return <>{children}</>;
}
