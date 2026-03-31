'use client';

import { useEffect } from 'react';
import { ThemeId, getThemeById, applyThemeCSS, generateThemeOverrides } from './theme-config';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedTheme = (localStorage.getItem('site-theme') as ThemeId) || 'default';
    const savedCustom = localStorage.getItem('site-custom-colors');
    
    let theme = getThemeById(savedTheme);
    if (savedTheme === 'custom' && savedCustom) {
      theme = {
        id: 'custom',
        name: 'Tùy biến',
        icon: '🎨',
        colors: JSON.parse(savedCustom),
        locked: false,
      };
    }

    const isDark = theme.id === 'highend' || theme.id === 'dark';
    
    let styleEl = document.getElementById('theme-overrides');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-overrides';
      document.head.appendChild(styleEl);
    }
    
    styleEl.textContent = applyThemeCSS(theme.colors) + generateThemeOverrides(theme.colors, isDark);
    
    if (theme.id === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme.id);
    }
  }, []);

  return <>{children}</>;
}
