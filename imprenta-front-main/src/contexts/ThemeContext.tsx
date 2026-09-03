// src/contexts/ThemeContext.tsx — modo oscuro/claro real con CSS variables
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme:       Theme;
  toggleTheme: () => void;
  isDark:      boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}

// ── Variables CSS por tema ────────────────────────────────────────────────────
const THEMES: Record<Theme, Record<string, string>> = {
  dark: {
    '--bg':              '#0f172a',
    '--bg-gradient':     'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
    '--sidebar':         'rgba(2, 6, 23, 0.85)',
    '--navbar':          'rgba(2, 6, 23, 0.7)',
    '--card':            'rgba(30, 41, 59, 0.45)',
    '--card-solid':      '#1e293b',
    '--card-strong':     'rgba(30, 41, 59, 0.65)',
    '--card-float':      'rgba(15, 23, 42, 0.9)',
    '--border':          'rgba(255, 255, 255, 0.08)',
    '--border-light':    'rgba(255, 255, 255, 0.12)',
    '--text':            '#ffffff',
    '--text-muted':      '#94a3b8',
    '--primary':         '#6366f1',
    '--primary-light':   '#818cf8',
    '--accent':          '#8b5cf6',
    '--glow':            'rgba(99, 102, 241, 0.15)',
    '--glow-strong':     'rgba(99, 102, 241, 0.25)',
    '--input-bg':        'rgba(30, 41, 59, 0.5)',
  },
  light: {
    '--bg':              '#f8fafc',
    '--bg-gradient':     'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%)',
    '--sidebar':         'rgba(255, 255, 255, 0.92)',
    '--navbar':          'rgba(255, 255, 255, 0.85)',
    '--card':            'rgba(255, 255, 255, 0.8)',
    '--card-solid':      '#ffffff',
    '--card-strong':     'rgba(255, 255, 255, 0.92)',
    '--card-float':      'rgba(255, 255, 255, 0.98)',
    '--border':          'rgba(15, 23, 42, 0.08)',
    '--border-light':    'rgba(15, 23, 42, 0.12)',
    '--text':            '#0f172a',
    '--text-muted':      '#64748b',
    '--primary':         '#4f46e5',
    '--primary-light':   '#6366f1',
    '--accent':          '#7c3aed',
    '--glow':            'rgba(79, 70, 229, 0.12)',
    '--glow-strong':     'rgba(79, 70, 229, 0.22)',
    '--input-bg':        'rgba(255, 255, 255, 0.9)',
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem('theme');
      return (stored === 'dark' || stored === 'light') ? stored : 'dark';
    } catch { return 'dark'; }
  });

  // Aplica variables CSS al :root
  useEffect(() => {
    const vars = THEMES[theme] ?? THEMES['dark'];
    Object.entries(vars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v)
    );
    document.documentElement.classList.toggle('dark',  theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}