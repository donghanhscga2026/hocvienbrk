'use client';

import { useEffect } from 'react';

const themes: Record<string, { primary: string; secondary: string; bg: string; text: string }> = {
  default: {
    primary: '#f59e0b',
    secondary: '#0ea5e9',
    bg: '#ffffff',
    text: '#171717',
  },
  highend: {
    primary: '#D4AF37',
    secondary: '#1e3a5f',
    bg: '#0f1419',
    text: '#ffffff',
  },
  dark: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    bg: '#0f172a',
    text: '#f8fafc',
  },
  light: {
    primary: '#6366f1',
    secondary: '#ec4899',
    bg: '#fafafa',
    text: '#18181b',
  },
};

function getThemeCSS(themeId: string) {
  const theme = themes[themeId];
  if (!theme || themeId === 'default') {
    return '';
  }
  
  return `
    /* Header - targeting common header classes */
    header[class*="bg-black"],
    header[class*="bg-gray-900"],
    header[class*="bg-gray-950"],
    div[class*="bg-black"][class*="text-white"] {
      background-color: ${theme.secondary} !important;
    }
    
    /* Primary buttons */
    button:bg-amber,
    button[class*="bg-amber"],
    button.bg-orange,
    button[class*="bg-orange"],
    a[class*="bg-amber"],
    a[class*="bg-orange"],
    [class*="btn-primary"],
    [class*="bg-primary"] {
      background-color: ${theme.primary} !important;
    }
    
    .bg-amber-500,
    .bg-orange-500 {
      background-color: ${theme.primary} !important;
    }
    
    .bg-amber-500:hover,
    .bg-orange-500:hover {
      background-color: ${theme.primary} !important;
      filter: brightness(0.9);
    }
    
    /* Text accents */
    .text-yellow-400,
    .text-yellow-500 {
      color: ${theme.primary} !important;
    }
    
    /* Background */
    body {
      background-color: ${theme.bg} !important;
    }
  `;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const savedTheme = localStorage.getItem('site-theme') || 'default';
    
    // Inject CSS overrides
    let styleEl = document.getElementById('theme-overrides');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'theme-overrides';
      document.head.appendChild(styleEl);
    }
    
    styleEl.textContent = getThemeCSS(savedTheme);
    
    // Set data attribute
    if (savedTheme === 'default') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', savedTheme);
    }
  }, []);

  return <>{children}</>;
}
