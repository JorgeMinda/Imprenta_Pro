import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast'; // <-- Importamos toast
import '../styles/login.css';

type Theme = {
  background: string;
  color: string;
  primary: string;
  secondary?: string;
};

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  // Eliminamos el estado 'error' local porque ahora confiaremos en los toasts

  // Estilo base para los toasts del Login
  const toastStyle = {
    background: '#1F2937',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.75rem',
  };

  // Temas originales
  const themes: Theme[] = [
    { background: '#1A1A2E', color: '#fff', primary: '#0F3460', secondary: '#533483' },
    { background: '#461220', color: '#fff', primary: '#E94560', secondary: '#FF6B6B' },
    { background: '#192A51', color: '#fff', primary: '#967AA1', secondary: '#C084FC' },
  ];

  // Cambiar tema con feedback visual
  const setTheme = (t: Theme) => {
    const root = document.documentElement;
    root.style.setProperty('--background', t.background);
    root.style.setProperty('--color', t.color);
    root.style.setProperty('--primary', t.primary);
    root.style.setProperty('--secondary', t.secondary || t.primary);
    
    // Feedback visual sutil al cambiar el tema
    toast('Tema actualizado', {
      icon: '🎨',
      style: toastStyle,
      duration: 2000,
    });
  };

  // Login
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await login(email, password);

    if (success) {
      // No hace falta un toast de éxito aquí porque el Dashboard ya lanza uno de Bienvenida
      navigate('/dashboard');
    } else {
      // Toast de error en vez del texto estático
      toast.error('Correo o contraseña incorrectos', {
        style: toastStyle,
        duration: 4000,
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Fondo animado con gradiente sutil */}
      <motion.div
        className="absolute inset-0 z-0"
        animate={{
          background: [
            'linear-gradient(135deg, var(--background), #000000)',
            'linear-gradient(135deg, #000000, var(--background))',
          ],
        }}
        transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
      />

      {/* Círculos decorativos elegantes */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-gradient-to-br from-blue-600/20 to-purple-600/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-gradient-to-br from-pink-600/20 to-indigo-600/10 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Contenedor principal unificado al diseño de la app */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md p-10 rounded-3xl bg-gray-900/40 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden"
      >
        {/* Título con gradiente */}
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-4xl font-extrabold text-center mb-8 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent"
        >
          Imprenta PRO
        </motion.h1>

        {/* Formulario (Limpiamos el bloque de error estático) */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-5 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          <div>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-5 py-4 bg-gray-900/50 border border-gray-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>

          {/* Botón de login animado */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Ingresando...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Iniciar Sesión
              </>
            )}
          </motion.button>
        </form>

        {/* Selector de temas */}
        <div className="mt-8 pt-6 border-t border-gray-700/50 flex flex-col items-center gap-4">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">Elige tu tema</p>
          <div className="flex justify-center gap-5">
            {themes.map((t, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.15, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setTheme(t)}
                className="w-10 h-10 rounded-full cursor-pointer border-2 border-white/20 hover:border-white/50 shadow-lg transition-all"
                style={{
                  background: `linear-gradient(135deg, ${t.primary}, ${t.secondary || t.primary})`,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}