// src/pages/Perfil.tsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../api/config';
import { useConfirm } from '../components/ConfirmModal';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Save, Shield, Briefcase, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

const toastStyle = {
  background: '#1F2937', color: 'white',
  borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)',
};

const ROL_CFG = {
  admin:    { label: 'Administrador', icon: Shield,    color: 'text-red-400',  bg: 'bg-red-500/10 border-red-500/20' },
  vendedor: { label: 'Vendedor',      icon: Briefcase, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  empleado: { label: 'Empleado',      icon: User,      color: 'text-gray-400', bg: 'bg-gray-500/10 border-gray-500/20' },
};

function InputField({ label, icon: Icon, type = 'text', value, onChange, placeholder, disabled }: {
  label: string; icon: any; type?: string;
  value: string; onChange?: (v: string) => void;
  placeholder?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-gray-800/50 border border-white/10 rounded-xl
            pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-600
            focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30
            disabled:opacity-50 disabled:cursor-not-allowed outline-none transition-all"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export default function Perfil() {
  const { user, token } = useAuth();
  const { confirmar }   = useConfirm();

  const rolCfg = ROL_CFG[(user?.rol as keyof typeof ROL_CFG) ?? 'empleado'];
  const RolIcon = rolCfg.icon;

  // Form datos personales
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [email,  setEmail]  = useState(user?.email  ?? '');
  const [savingDatos, setSavingDatos] = useState(false);

  // Form contraseña
  const [passActual,   setPassActual]   = useState('');
  const [passNueva,    setPassNueva]    = useState('');
  const [passConfirm,  setPassConfirm]  = useState('');
  const [savingPass,   setSavingPass]   = useState(false);

  // ── Guardar datos personales ──────────────────────────────────────────────
  const handleGuardarDatos = async () => {
    if (!nombre.trim()) return toast.error('El nombre no puede estar vacío', { style: toastStyle });

    const ok = await confirmar({
      titulo:    'Guardar cambios',
      mensaje:   '¿Deseas actualizar tu nombre y email?',
      variante:  'info',
      labelOk:   'Guardar',
    });
    if (!ok) return;

    setSavingDatos(true);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/${user?.id}`, {
        method:  'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ nombre: nombre.trim(), email: email.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).msg || 'Error al guardar');
      toast.success('Datos actualizados correctamente', { style: toastStyle });
    } catch (err: any) {
      toast.error(err.message, { style: toastStyle });
    } finally {
      setSavingDatos(false);
    }
  };

  // ── Cambiar contraseña ────────────────────────────────────────────────────
  const handleCambiarPassword = async () => {
    if (!passActual || !passNueva || !passConfirm)
      return toast.error('Completa todos los campos', { style: toastStyle });
    if (passNueva.length < 6)
      return toast.error('La contraseña debe tener al menos 6 caracteres', { style: toastStyle });
    if (passNueva !== passConfirm)
      return toast.error('Las contraseñas no coinciden', { style: toastStyle });

    const ok = await confirmar({
      titulo:   'Cambiar contraseña',
      mensaje:  'Deberás usar la nueva contraseña en tu próximo inicio de sesión.',
      variante: 'warning',
      labelOk:  'Cambiar',
    });
    if (!ok) return;

    setSavingPass(true);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/${user?.id}/password`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password_actual: passActual, password_nuevo: passNueva }),
      });
      if (!res.ok) throw new Error((await res.json()).msg || 'Error al cambiar contraseña');
      toast.success('Contraseña actualizada correctamente', { style: toastStyle });
      setPassActual(''); setPassNueva(''); setPassConfirm('');
    } catch (err: any) {
      toast.error(err.message, { style: toastStyle });
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">Mi Perfil</h1>
        <p className="text-sm text-gray-400 mt-1">Gestiona tu información personal y seguridad</p>
      </div>

      {/* Tarjeta de identidad */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-5">
          {/* Avatar grande */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600
            flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-500/30 shrink-0">
            {user?.nombre?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user?.nombre}</h2>
            <p className="text-sm text-gray-400">{user?.email}</p>
            <div className={`inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full border text-xs font-semibold ${rolCfg.bg} ${rolCfg.color}`}>
              <RolIcon className="w-3 h-3" />
              {rolCfg.label}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Datos personales */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-400" /> Datos personales
        </h3>
        <div className="space-y-4">
          <InputField label="Nombre completo" icon={User}  value={nombre} onChange={setNombre} placeholder="Tu nombre" />
          <InputField label="Correo electrónico" icon={Mail} value={email}  onChange={setEmail}  placeholder="tu@email.com" />
        </div>
        <div className="mt-5 flex justify-end">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleGuardarDatos} disabled={savingDatos}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold
              shadow-lg shadow-indigo-500/30 disabled:opacity-60 transition-all"
          >
            <Save className="w-4 h-4" />
            {savingDatos ? 'Guardando…' : 'Guardar cambios'}
          </motion.button>
        </div>
      </motion.div>

      {/* Cambiar contraseña */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
        <h3 className="text-base font-semibold text-white mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" /> Cambiar contraseña
        </h3>
        <div className="space-y-4">
          <InputField label="Contraseña actual"    icon={Lock} type="password" value={passActual}  onChange={setPassActual}  placeholder="••••••••" />
          <InputField label="Nueva contraseña"     icon={Lock} type="password" value={passNueva}   onChange={setPassNueva}   placeholder="Mínimo 6 caracteres" />
          <InputField label="Confirmar contraseña" icon={Lock} type="password" value={passConfirm} onChange={setPassConfirm} placeholder="Repite la nueva contraseña" />
        </div>

        {/* Indicador de fortaleza */}
        {passNueva && (
          <div className="mt-3 space-y-1">
            <div className="flex gap-1">
              {[1,2,3,4].map(n => (
                <div key={n} className={`h-1 flex-1 rounded-full transition-all ${
                  passNueva.length >= n * 3
                    ? n <= 1 ? 'bg-red-400'
                    : n <= 2 ? 'bg-amber-400'
                    : n <= 3 ? 'bg-blue-400'
                    : 'bg-emerald-400'
                    : 'bg-gray-700'
                }`} />
              ))}
            </div>
            <p className="text-xs text-gray-500">
              {passNueva.length < 6  ? 'Muy corta' :
               passNueva.length < 9  ? 'Débil' :
               passNueva.length < 12 ? 'Moderada' : 'Fuerte'}
            </p>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleCambiarPassword} disabled={savingPass}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl
              bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold
              shadow-lg shadow-amber-500/30 disabled:opacity-60 transition-all"
          >
            <Lock className="w-4 h-4" />
            {savingPass ? 'Cambiando…' : 'Cambiar contraseña'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}