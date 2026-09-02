// src/pages/Usuarios.tsx — Panel de gestión de usuarios (solo admin)
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../api/config';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Plus, Search, Edit2, Trash2, Key, X,
  Shield, User, Briefcase, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination, { usePagination } from '../components/Pagination';
import { useConfirm } from '../components/ConfirmModal';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'admin' | 'vendedor' | 'empleado';
  cedula: string | null;
  creado_en: string;
}

const toastStyle = {
  background: '#1F2937', color: 'white',
  borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)',
};

const ROL_CONFIG = {
  admin:    { label: 'Admin',    color: 'bg-red-500/10 text-red-400 border-red-500/30',       icon: Shield },
  vendedor: { label: 'Vendedor', color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',    icon: Briefcase },
  empleado: { label: 'Empleado', color: 'bg-gray-500/10 text-gray-400 border-gray-500/30',   icon: User },
};

function RolBadge({ rol }: { rol: keyof typeof ROL_CONFIG }) {
  const cfg = ROL_CONFIG[rol] ?? ROL_CONFIG.empleado;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <cfg.icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ── Modal crear/editar usuario ──────────────────────────────────────────────
function ModalUsuario({ usuario, onClose, onSave }: {
  usuario: Usuario | null; onClose: () => void; onSave: () => void;
}) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    nombre:   usuario?.nombre  || '',
    email:    usuario?.email   || '',
    rol:      usuario?.rol     || 'empleado',
    cedula:   usuario?.cedula  || '',
    password: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es requerido', { style: toastStyle });
    if (!form.email.trim())  return toast.error('El email es requerido', { style: toastStyle });
    if (!usuario && (!form.password || form.password.length < 6))
      return toast.error('La contraseña debe tener al menos 6 caracteres', { style: toastStyle });

    setSaving(true);
    try {
      const url    = usuario
        ? `${API_BASE}/api/usuarios/${usuario.id}`
        : `${API_BASE}/api/usuarios`;
      const method = usuario ? 'PUT' : 'POST';
      const body   = usuario
        ? { nombre: form.nombre, email: form.email, rol: form.rol, cedula: form.cedula }
        : form;

      const res  = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Error');

      toast.success(usuario ? 'Usuario actualizado' : 'Usuario creado ✅', { style: toastStyle });
      onSave();
      onClose();
    } catch (err: any) {
      toast.error(err.message, { style: toastStyle });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl shadow-2xl"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <Users className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white">{usuario ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { key: 'nombre', label: 'Nombre completo *', type: 'text', placeholder: 'Juan Pérez' },
              { key: 'email',  label: 'Email *',           type: 'email', placeholder: 'juan@empresa.com' },
              { key: 'cedula', label: 'Cédula',            type: 'text', placeholder: '0912345678' },
            ].map(f => (
              <div key={f.key} className={f.key === 'email' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">{f.label}</label>
                <input type={f.type} placeholder={f.placeholder}
                  value={(form as any)[f.key]}
                  onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-gray-800/60 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600"
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">Rol</label>
            <div className="grid grid-cols-3 gap-2">
              {(['admin','vendedor','empleado'] as const).map(r => {
                const cfg = ROL_CONFIG[r];
                return (
                  <button key={r} onClick={() => setForm(p => ({ ...p, rol: r }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5
                      ${form.rol === r ? `${cfg.color} ring-2 ring-white/10` : 'bg-gray-800/60 text-gray-400 border-white/5 hover:text-white'}`}
                  >
                    <cfg.icon className="w-3.5 h-3.5" /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {!usuario && (
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">Contraseña *</label>
              <input type="password" placeholder="Mínimo 6 caracteres"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600"
              />
            </div>
          )}

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSubmit} disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-lg"
          >
            {saving ? 'Guardando…' : usuario ? 'Guardar cambios' : 'Crear usuario'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Modal cambiar contraseña ────────────────────────────────────────────────
function ModalPassword({ usuario, onClose }: { usuario: Usuario; onClose: () => void }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ password_nuevo: '', confirmar: '' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (form.password_nuevo.length < 6)
      return toast.error('Mínimo 6 caracteres', { style: toastStyle });
    if (form.password_nuevo !== form.confirmar)
      return toast.error('Las contraseñas no coinciden', { style: toastStyle });

    setSaving(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/usuarios/${usuario.id}/password`,
        {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password_nuevo: form.password_nuevo }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg || 'Error');
      toast.success('Contraseña actualizada ✅', { style: toastStyle });
      onClose();
    } catch (err: any) {
      toast.error(err.message, { style: toastStyle });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <motion.div initial={{ scale: 0.9, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-sm bg-gray-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg border border-amber-500/30">
              <Key className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Cambiar contraseña</h3>
              <p className="text-xs text-gray-400">{usuario.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        {['password_nuevo','confirmar'].map(k => (
          <div key={k}>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">
              {k === 'password_nuevo' ? 'Nueva contraseña' : 'Confirmar contraseña'}
            </label>
            <input type="password" placeholder="••••••"
              value={(form as any)[k]}
              onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
              className="w-full px-4 py-2.5 bg-gray-800/60 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        ))}

        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSubmit} disabled={saving}
          className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all"
        >
          {saving ? 'Guardando…' : 'Actualizar contraseña'}
        </motion.button>
      </motion.div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function Usuarios() {
  const { token, user: me } = useAuth();
  const { confirmar } = useConfirm();
  const [usuarios, setUsuarios]   = useState<Usuario[]>([]);
  const [filtered, setFiltered]   = useState<Usuario[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busqueda, setBusqueda]   = useState('');
  const [modalEdit,  setModalEdit]  = useState<Usuario | 'nuevo' | null>(null);
  const [modalPwd,   setModalPwd]   = useState<Usuario | null>(null);

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/usuarios`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Sin acceso');
      const data = await res.json();
      setUsuarios(data);
      setFiltered(data);
    } catch (err: any) {
      toast.error(err.message || 'Error al cargar usuarios', { style: toastStyle });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) fetchUsuarios(); }, [token]);

  useEffect(() => {
    const t = busqueda.toLowerCase();
    setFiltered(t
      ? usuarios.filter(u =>
          u.nombre.toLowerCase().includes(t) ||
          u.email.toLowerCase().includes(t) ||
          u.rol.toLowerCase().includes(t)
        )
      : usuarios
    );
  }, [busqueda, usuarios]);
  const pagination = usePagination(filtered);

  const handleEliminar = async (u: Usuario) => {
    const ok = await confirmar({
      titulo:   'Eliminar usuario',
      mensaje:  `¿Eliminar a "${u.nombre}"? Esta acción no se puede deshacer.`,
      variante: 'danger',
      labelOk:  'Eliminar',
    });
    if (!ok) return;
    try {
      const res = await fetch(`${API_BASE}/api/usuarios/${u.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.msg);
      toast.success('Usuario eliminado', { style: toastStyle });
      fetchUsuarios();
    } catch (err: any) {
      toast.error(err.message, { style: toastStyle });
    }
  };

  if (me?.rol !== 'admin') return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center p-12 bg-red-500/10 border border-red-500/20 rounded-3xl">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-xl text-red-400">Acceso restringido a administradores</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Usuarios</h1>
          <p className="text-sm text-gray-400 mt-1">Administra el equipo y sus permisos</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => setModalEdit('nuevo')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg transition-all text-sm"
        >
          <Plus className="w-4 h-4" /> Nuevo Usuario
        </motion.button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        {(['admin','vendedor','empleado'] as const).map(rol => {
          const cfg   = ROL_CONFIG[rol];
          const count = usuarios.filter(u => u.rol === rol).length;
          return (
            <motion.div key={rol} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex items-center gap-4"
            >
              <div className={`p-2.5 rounded-xl border ${cfg.color}`}>
                <cfg.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-black text-white">{count}</p>
                <p className="text-xs text-gray-400">{cfg.label}{count !== 1 ? 'es' : ''}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input type="text" placeholder="Buscar por nombre, email o rol..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-900/40 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none transition-all"
        />
      </div>

      {/* Tabla */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/40 border-b border-white/5">
                {['Usuario','Email','Rol','Cédula','Desde','Acciones'].map(h => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-400 uppercase ${h === 'Acciones' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {[1,2,3,4,5,6].map(j => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-700/60 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">No se encontraron usuarios</p>
                  </td>
                </tr>
              ) : (
                pagination.paginated.map(u => (
                  <tr key={u.id} className={`hover:bg-white/5 transition-colors ${u.id === Number(me?.id) ? 'border-l-2 border-indigo-500/50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                          {u.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{u.nombre}</p>
                          {u.id === Number(me?.id) && <p className="text-xs text-indigo-400">Tú</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{u.email}</td>
                    <td className="px-6 py-4"><RolBadge rol={u.rol} /></td>
                    <td className="px-6 py-4 text-sm text-gray-400">{u.cedula || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{u.creado_en}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <button onClick={() => setModalEdit(u)}
                          className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors" title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setModalPwd(u)}
                          className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-400 transition-colors" title="Cambiar contraseña">
                          <Key size={16} />
                        </button>
                        {u.id !== Number(me?.id) && (
                          <button onClick={() => handleEliminar(u)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors" title="Eliminar">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={pagination.total} page={pagination.page} pageSize={pagination.pageSize} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
      </motion.div>

      <AnimatePresence>
        {modalEdit !== null && (
          <ModalUsuario
            usuario={modalEdit === 'nuevo' ? null : modalEdit}
            onClose={() => setModalEdit(null)}
            onSave={fetchUsuarios}
          />
        )}
        {modalPwd && (
          <ModalPassword usuario={modalPwd} onClose={() => setModalPwd(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}