// src/components/ThemeSwitcher.tsx
import { useTheme } from '../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';

export default function ThemeSwitcher() {
  const { toggleTheme, isDark } = useTheme();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      onClick={toggleTheme}
      title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      className="relative w-14 h-7 rounded-full border transition-all duration-300
        flex items-center px-1 overflow-hidden"
      style={{
        background: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(251,191,36,0.2)',
        borderColor: isDark ? 'rgba(99,102,241,0.4)' : 'rgba(251,191,36,0.4)',
      }}
    >
      {/* Track icons */}
      <Moon className="absolute left-1.5 w-3.5 h-3.5 text-indigo-400" />
      <Sun  className="absolute right-1.5 w-3.5 h-3.5 text-amber-400" />

      {/* Thumb animado */}
      <motion.div
        layout
        animate={{ x: isDark ? 0 : 28 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="w-5 h-5 rounded-full shadow-lg z-10 flex items-center justify-center"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
            : 'linear-gradient(135deg, #fbbf24, #f59e0b)',
          boxShadow: isDark
            ? '0 0 8px rgba(99,102,241,0.6)'
            : '0 0 8px rgba(251,191,36,0.6)',
        }}
      >
        {isDark
          ? <Moon className="w-2.5 h-2.5 text-white" />
          : <Sun  className="w-2.5 h-2.5 text-white" />
        }
      </motion.div>
    </motion.button>
  );
}