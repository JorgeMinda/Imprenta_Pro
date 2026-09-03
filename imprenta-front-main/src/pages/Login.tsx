import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { LogIn, Loader2, Printer } from 'lucide-react';
import toast from 'react-hot-toast';

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

  const toastStyle = {
    background: '#1F2937',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '0.75rem',
  };

  const themes: Theme[] = [
    { background: '#1A1A2E', color: '#fff', primary: '#6366f1', secondary: '#8b5cf6' },
    { background: '#461220', color: '#fff', primary: '#E94560', secondary: '#FF6B6B' },
    { background: '#192A51', color: '#fff', primary: '#967AA1', secondary: '#C084FC' },
  ];

  const setTheme = (t: Theme) => {
    const root = document.documentElement;
    root.style.setProperty('--background', t.background);
    root.style.setProperty('--color', t.color);
    root.style.setProperty('--primary', t.primary);
    root.style.setProperty('--secondary', t.secondary || t.primary);
    toast('Tema actualizado', { icon: '🎨', style: toastStyle, duration: 2000 });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await login(email, password);
    if (res.ok) {
      navigate('/dashboard');
    } else {
      toast.error(res.msg || 'Correo o contraseña incorrectos', { style: toastStyle, duration: 4000 });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Fondo con gradiente animado */}
      <div className="absolute inset-0 z-0" style={{ background: 'var(--bg-gradient)' }} />

      {/* Orbes de luz decorativos */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-30"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
        animate={{ x: [0, 50, -30, 0], y: [0, -40, 20, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-[400px] h-[400px] rounded-full blur-[100px] opacity-20"
        style={{ background: 'radial-gradient(circle, #8b5cf6 0%, transparent 70%)', bottom: '-10%', right: '-5%' }}
        animate={{ x: [0, -40, 30, 0], y: [0, 30, -20, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      />

      {/* Tarjeta de login glassmorphism */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="glass-float p-10 relative overflow-hidden">
          {/* Brillo sutil interior */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />

          {/* Logo */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="flex flex-col items-center mb-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30">
              <Printer className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Imprenta PRO
            </h1>
            <p className="text-sm text-gray-400 mt-2">Sistema de Gestión</p>
          </motion.div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="email"
                placeholder="Correo electrónico"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="glass-input w-full px-5 py-3.5"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="glass-input w-full px-5 py-3.5"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="glass-btn w-full py-3.5 flex items-center justify-center gap-3 text-base disabled:opacity-70 disabled:cursor-not-allowed"
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
          <div className="mt-8 pt-6 border-t border-white/5 flex flex-col items-center gap-4">
            <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Tema</p>
            <div className="flex justify-center gap-4">
              {themes.map((t, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.15, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setTheme(t)}
                  className="w-9 h-9 rounded-full cursor-pointer border-2 border-white/10 hover:border-white/30 shadow-lg transition-all"
                  style={{ background: `linear-gradient(135deg, ${t.primary}, ${t.secondary || t.primary})` }}
                />
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
