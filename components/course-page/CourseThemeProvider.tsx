'use client'

import React from 'react'
import { CourseThemeConfig } from '@/lib/course-page/types'

interface CourseThemeProviderProps {
  theme: CourseThemeConfig
  children: React.ReactNode
}

export default function CourseThemeProvider({ theme, children }: CourseThemeProviderProps) {
  const styleVars = React.useMemo(() => {
    return {
      // Design Tokens — overridable from DB theme
      '--accent':       theme.primaryColor   || '#C86B3D',
      '--accent-hover': theme.accentColor    || '#D97949',
      '--bg-dark':      theme.backgroundColor|| '#171823',
      '--bg-dark-soft': theme.surfaceColor   || '#22242E',
      '--bg-light':     '#F3E9D7',
      '--bg-success':   '#647B5E',

      '--text-heading': theme.textColor      || '#F8F1E6',
      '--text-body':    theme.mutedTextColor || '#C8C3BA',
      '--text-muted':   '#A8A39C',

      '--border-dark':  'rgba(255,255,255,.08)',
      '--border-light': 'rgba(0,0,0,.08)',

      '--radius-card':   theme.borderRadius  || '16px',
      '--radius-button': theme.buttonRadius  || '8px',
      '--container':     '1180px',
      '--section-space': '120px',
      '--transition':    '.3s ease',

      // Legacy aliases (for old components)
      '--course-primary':   theme.primaryColor   || '#C86B3D',
      '--course-secondary': theme.secondaryColor || '#C86B3D',
      '--course-accent':    theme.accentColor    || '#D97949',
      '--course-bg':        theme.backgroundColor|| '#171823',
      '--course-surface':   theme.surfaceColor   || '#22242E',
      '--course-text':      theme.textColor      || '#F8F1E6',
      '--course-muted':     theme.mutedTextColor || '#C8C3BA',
      '--course-border':    'rgba(255,255,255,.08)',
      '--course-radius':    theme.borderRadius   || '16px',
      '--course-btn-radius':theme.buttonRadius   || '8px',
      '--course-container-max': '1180px',
    } as React.CSSProperties
  }, [theme])

  return (
    <div style={styleVars} className="min-h-screen bg-[var(--bg-dark)] text-[var(--text-body)] antialiased">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,700&family=Inter:wght@300;400;500;600;700&display=swap');

        /* Typography base */
        .course-page, .course-page * {
          box-sizing: border-box;
        }
        .course-page {
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 18px;
          line-height: 1.75;
        }
        .course-page h1,
        .course-page h2,
        .course-page h3,
        .course-page h4,
        .course-page .font-serif {
          font-family: 'Cormorant Garamond', Georgia, serif !important;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }

        /* Section themes */
        .section-dark {
          background-color: var(--bg-dark) !important;
          color: var(--text-body) !important;
          --course-bg: var(--bg-dark);
          --course-text: var(--text-heading);
          --course-muted: var(--text-muted);
          --course-border: var(--border-dark);
          --course-surface: var(--bg-dark-soft);
        }
        .section-soft {
          background-color: var(--bg-dark-soft) !important;
          color: var(--text-body) !important;
          --course-bg: var(--bg-dark-soft);
          --course-text: var(--text-heading);
          --course-muted: var(--text-muted);
          --course-border: var(--border-dark);
          --course-surface: var(--bg-dark);
        }
        .section-light {
          background-color: var(--bg-light) !important;
          color: #2E2A27 !important;
          --course-bg: var(--bg-light);
          --course-text: #2E2A27;
          --course-muted: #6B6459;
          --course-border: var(--border-light);
          --course-surface: #F6EDDE;
        }
        .section-success {
          background-color: var(--bg-success) !important;
          color: var(--text-heading) !important;
          --course-bg: var(--bg-success);
          --course-text: var(--text-heading);
          --course-muted: rgba(248,241,230,0.75);
          --course-border: rgba(255,255,255,0.15);
          --course-surface: rgba(255,255,255,0.08);
        }
      `}} />
      <div className="course-page">
        {children}
      </div>
    </div>
  )
}
