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
    '--background': '#0f1117',
    '--sidebar':    '#111827',
    '--navbar':     '#111827',
    '--card':       'rgba(17,24,39,0.4)',
    '--border':     'rgba(255,255,255,0.08)',
    '--text':       '#f9fafb',
    '--text-muted': '#9ca3af',
    '--primary':    '#4F46E5',
    '--input-bg':   'rgba(17,24,39,0.6)',
  },
  light: {
    '--background': '#f1f5f9',
    '--sidebar':    '#ffffff',
    '--navbar':     '#ffffff',
    '--card':       'rgba(255,255,255,0.9)',
    '--border':     'rgba(0,0,0,0.08)',
    '--text':       '#0f172a',
    '--text-muted': '#64748b',
    '--primary':    '#4F46E5',
    '--input-bg':   'rgba(241,245,249,0.9)',
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