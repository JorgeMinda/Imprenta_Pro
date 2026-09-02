// src/pages/Inventario.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Plus, Search, AlertTriangle, TrendingUp, TrendingDown,
  X, Edit2, Trash2, ArrowUpCircle, ArrowDownCircle, History,
  AlertCircle, RefreshCw, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination, { usePagination } from '../components/Pagination';
import { useConfirm } from '../components/ConfirmModal';

interface ItemInventario {
  id: number;
  material_id: number;
  material: string;
  descripcion: string | null;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
  alerta: boolean;
}

interface Movimiento {
  id: number;
  material: string;
  unidad: string;
  cantidad: number;
  tipo: 'entrada' | 'salida';
  orden_id: number | null;
  fecha: string;
}

const toastStyle = {
  background: '#1F2937', color: 'white',
  borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)',
};

// ── Skeleton loader ────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr>
      {[1,2,3,4,5,6].map(i => (
        <td key={i} className="px-6 py-4">
          <div className="h-4 bg-gray-700/60 rounded animate-pulse" style={{ width: `${60 + i*10}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ── Modal crear/editar material ────────────────────────────────────────────
function ModalMaterial({ item, onClose, onSave }: {
  item: ItemInventario | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    nombre:       item?.material    || '',
    descripcion:  item?.descripcion || '',
    unidad:       item?.unidad      || '',
    stock_actual: item ? undefined  : 0,
    stock_minimo: item?.stock_minimo ?? 5,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.nombre.trim()) return toast.error('El nombre es requerido', { style: toastStyle });
    if (!form.unidad.trim()) return toast.error('La unidad es requerida', { style: toastStyle });

    setSaving(true);
    try {
      if (item) {
        await apiClient.put(`/api/inventario/${item.id}`, form);
      } else {
        await apiClient.post('/api/inventario/materiales', form);
      }

      toast.success(item ? 'Material actualizado' : 'Material creado ✅', { style: toastStyle });
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
        onClick={onClose} className="absolute inset-0 glass-overlay" />
      <motion.div initial={{ scale: 0.9, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-lg glass-float overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-800 glass-nav sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <Layers className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-white">{item ? 'Editar Material' : 'Nuevo Material'}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {(['nombre','descripcion','unidad'] as const).map(field => (
            <div key={field}>
              <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">
                {field === 'nombre' ? 'Nombre *' : field === 'descripcion' ? 'Descripción' : 'Unidad (ej: kg, resma, unidad) *'}
              </label>
              <input
                value={(form as any)[field]}
                onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-600"
                placeholder={field === 'nombre' ? 'Tóner negro HP' : field === 'descripcion' ? 'Descripción opcional...' : 'kg'}
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-4">
            {!item && (
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">Stock inicial</label>
                <input type="number" min="0"
                  value={form.stock_actual}
                  onChange={e => setForm(p => ({ ...p, stock_actual: Number(e.target.value) }))}
                  className="w-full px-4 py-2.5 bg-gray-800/60 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none transition-all"
                />
              </div>
            )}
            <div className={!item ? '' : 'col-span-2'}>
              <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">Stock mínimo (alerta)</label>
              <input type="number" min="0"
                value={form.stock_minimo}
                onChange={e => setForm(p => ({ ...p, stock_minimo: Number(e.target.value) }))}
                className="w-full px-4 py-2.5 bg-gray-800/60 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSubmit} disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-lg mt-2"
          >
            {saving ? 'Guardando…' : item ? 'Guardar cambios' : 'Crear material'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Modal movimiento ────────────────────────────────────────────────────────
function ModalMovimiento({ item, tipo, onClose, onSave }: {
  item: ItemInventario;
  tipo: 'entrada' | 'salida';
  onClose: () => void;
  onSave: () => void;
}) {
  const [cantidad, setCantidad] = useState(1);
  const [saving, setSaving]     = useState(false);

  const handleSubmit = async () => {
    if (cantidad <= 0) return toast.error('La cantidad debe ser mayor a 0', { style: toastStyle });
    setSaving(true);
    try {
      await apiClient.post('/api/inventario/movimientos', { material_id: item.material_id, cantidad, tipo });
      toast.success(`${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada ✅`, { style: toastStyle });
      onSave();
      onClose();
    } catch (err: any) {
      toast.error(err.message, { style: toastStyle });
    } finally {
      setSaving(false);
    }
  };

  const isEntrada = tipo === 'entrada';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 glass-overlay" />
      <motion.div initial={{ scale: 0.9, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-sm glass-float overflow-hidden"
      >
        <div className={`p-6 border-b border-gray-800 ${isEntrada ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${isEntrada ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-red-500/20 border-red-500/30'}`}>
                {isEntrada ? <ArrowUpCircle className="w-5 h-5 text-emerald-400" /> : <ArrowDownCircle className="w-5 h-5 text-red-400" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{isEntrada ? 'Registrar Entrada' : 'Registrar Salida'}</h3>
                <p className="text-xs text-gray-400">{item.material}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className={`p-3 rounded-xl border ${isEntrada ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <p className="text-xs text-gray-400">Stock actual</p>
            <p className="text-2xl font-black text-white">{item.stock_actual} <span className="text-sm font-normal text-gray-400">{item.unidad}</span></p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">
              Cantidad a {isEntrada ? 'agregar' : 'retirar'}
            </label>
            <input type="number" min="1" max={!isEntrada ? item.stock_actual : undefined}
              value={cantidad}
              onChange={e => setCantidad(Number(e.target.value))}
              className="w-full px-4 py-3 bg-gray-800/60 border border-white/10 rounded-xl text-white text-xl font-bold focus:border-indigo-500 outline-none transition-all text-center"
            />
            {!isEntrada && cantidad > item.stock_actual && (
              <p className="text-xs text-red-400 mt-1">⚠ Excede el stock disponible</p>
            )}
          </div>

          <div className={`p-3 rounded-xl border ${isEntrada ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <p className="text-xs text-gray-400">Stock resultante</p>
            <p className={`text-lg font-bold ${isEntrada ? 'text-emerald-400' : 'text-red-400'}`}>
              {isEntrada ? item.stock_actual + cantidad : item.stock_actual - cantidad} {item.unidad}
            </p>
          </div>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSubmit} disabled={saving || (!isEntrada && cantidad > item.stock_actual)}
            className={`w-full py-3 font-semibold rounded-xl transition-all disabled:opacity-60 text-white
              ${isEntrada
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'
                : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500'
              }`}
          >
            {saving ? 'Registrando…' : `Confirmar ${isEntrada ? 'entrada' : 'salida'}`}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Modal historial ─────────────────────────────────────────────────────────
function ModalHistorial({ item, onClose }: { item: ItemInventario; onClose: () => void }) {
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const data = await apiClient.get<Movimiento[]>(`/api/inventario/movimientos?material_id=${item.material_id}`);
        setMovimientos(data);
      } catch {
        toast.error('Error al cargar historial', { style: toastStyle });
      } finally {
        setLoading(false);
      }
    };
    fetchHistorial();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 glass-overlay" />
      <motion.div initial={{ scale: 0.9, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.9, y: 30, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-2xl glass-float overflow-hidden max-h-[80vh] flex flex-col"
      >
        <div className="flex justify-between items-center p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
              <History className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Historial de Movimientos</h3>
              <p className="text-xs text-gray-400">{item.material}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex space-x-2">
                {[0,0.1,0.2].map((d,i) => (
                  <div key={i} className="w-3 h-3 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${d}s` }} />
                ))}
              </div>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">
              <History className="w-12 h-12 mb-3 opacity-30" />
              <p>Sin movimientos registrados</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-800/40 border-b border-white/5 sticky top-0">
                <tr>
                  {['Tipo','Cantidad','Fecha','Orden'].map(h => (
                    <th key={h} className="px-6 py-3 text-xs font-semibold text-gray-400 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {movimientos.map(m => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border
                        ${m.tipo === 'entrada'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {m.tipo === 'entrada' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {m.tipo}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-white font-semibold">{m.cantidad} <span className="text-gray-400 text-xs">{m.unidad}</span></td>
                    <td className="px-6 py-3 text-gray-300 text-sm">{m.fecha}</td>
                    <td className="px-6 py-3 text-gray-400 text-sm">{m.orden_id ? `#${m.orden_id}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ────────────────────────────────────────────────────────
export default function Inventario() {
  const { user } = useAuth();
  const [inventario, setInventario]   = useState<ItemInventario[]>([]);
  const [filtered, setFiltered]       = useState<ItemInventario[]>([]);
  const [loading, setLoading]         = useState(true);
  const [busqueda, setBusqueda]       = useState('');
  const [soloAlertas, setSoloAlertas] = useState(false);

  // Modales
  const [modalMaterial,    setModalMaterial]    = useState<'nuevo' | ItemInventario | null>(null);
  const [modalMovimiento,  setModalMovimiento]  = useState<{ item: ItemInventario; tipo: 'entrada'|'salida' } | null>(null);
  const [modalHistorial,   setModalHistorial]   = useState<ItemInventario | null>(null);

  const puedeEditar = user?.rol === 'admin' || user?.rol === 'vendedor';
  const { confirmar } = useConfirm();
  const pagination = usePagination(filtered);

  const fetchInventario = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<ItemInventario[]>('/api/inventario');
      setInventario(data);
      setFiltered(data);
    } catch (err: any) {
      toast.error(err.message, { style: toastStyle });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventario(); }, []);

  useEffect(() => {
    let result = [...inventario];
    if (soloAlertas) result = result.filter(i => i.alerta);
    if (busqueda.trim()) {
      const t = busqueda.toLowerCase();
      result = result.filter(i =>
        i.material.toLowerCase().includes(t) ||
        (i.descripcion || '').toLowerCase().includes(t) ||
        i.unidad.toLowerCase().includes(t)
      );
    }
    setFiltered(result);
  }, [busqueda, soloAlertas, inventario]);

  const handleEliminar = async (item: ItemInventario) => {
    const ok = await confirmar({
      titulo:   'Eliminar material',
      mensaje:  `¿Eliminar "${item.material}"? Si tiene movimientos registrados no podrá borrarse.`,
      variante: 'danger',
      labelOk:  'Eliminar',
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/api/inventario/${item.id}`);
      toast.success('Material eliminado', { style: toastStyle });
      fetchInventario();
    } catch (err: any) {
      toast.error(err.message || 'No se puede eliminar este material', { style: toastStyle });
    }
  };

  const alertasCount = inventario.filter(i => i.alerta).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Inventario</h1>
          <p className="text-sm text-gray-400 mt-1">Control de materiales y stock</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => fetchInventario()}
            className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-white/10 rounded-xl text-gray-400 hover:text-white transition text-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          {puedeEditar && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setModalMaterial('nuevo')}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg transition-all text-sm"
            >
              <Plus className="w-4 h-4" /> Nuevo Material
            </motion.button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total materiales', value: inventario.length, color: '#6366F1', icon: Layers },
          { label: 'Stock OK',         value: inventario.filter(i => !i.alerta).length, color: '#10B981', icon: Package },
          { label: 'Alertas',          value: alertasCount,   color: '#EF4444', icon: AlertTriangle },
          { label: 'Sin stock',        value: inventario.filter(i => i.stock_actual <= 0).length, color: '#F59E0B', icon: AlertCircle },
        ].map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="glass p-5 flex items-center gap-4"
          >
            <div className="p-2.5 rounded-xl" style={{ background: `${k.color}20`, border: `1px solid ${k.color}30` }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-2xl font-black text-white">{k.value}</p>
              <p className="text-xs text-gray-400">{k.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Alertas banner */}
      {alertasCount > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse shrink-0" />
          <p className="text-red-300 text-sm font-medium">
            {alertasCount} material{alertasCount > 1 ? 'es' : ''} con stock bajo o agotado.
            <button onClick={() => setSoloAlertas(v => !v)} className="ml-2 underline text-red-400 hover:text-red-300">
              {soloAlertas ? 'Ver todos' : 'Ver solo alertas'}
            </button>
          </p>
        </motion.div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Buscar material..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 glass-input"
          />
        </div>
        <button onClick={() => setSoloAlertas(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all
            ${soloAlertas
              ? 'bg-red-500/20 border-red-500/40 text-red-300'
              : 'bg-gray-900/40 border-white/10 text-gray-400 hover:text-white'}`}
        >
          <AlertTriangle className="w-4 h-4" />
          {soloAlertas ? 'Mostrando alertas' : 'Solo alertas'}
        </button>
      </div>

      {/* Tabla */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/40 border-b border-white/5">
                {['Material','Descripción','Unidad','Stock actual','Stock mínimo','Acciones'].map(h => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-400 uppercase ${h === 'Acciones' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {inventario.length === 0 ? 'No hay materiales registrados. ¡Agrega el primero!' : 'Sin resultados para esta búsqueda.'}
                    </p>
                  </td>
                </tr>
              ) : (
                pagination.paginated.map(item => (
                  <tr key={item.id} className={`hover:bg-white/5 transition-colors ${item.alerta ? 'border-l-2 border-red-500/50' : ''}`}>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-white">{item.material}</p>
                      {item.alerta && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-400 mt-0.5">
                          <AlertTriangle className="w-3 h-3" /> Stock bajo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{item.descripcion || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">{item.unidad}</td>
                    <td className="px-6 py-4">
                      <span className={`text-lg font-black ${
                        item.stock_actual <= 0 ? 'text-red-400' :
                        item.alerta ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {item.stock_actual}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">{item.stock_minimo}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-1">
                        {puedeEditar && (<>
                          <button onClick={() => setModalMovimiento({ item, tipo: 'entrada' })}
                            className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-emerald-500 transition-colors" title="Registrar entrada">
                            <ArrowUpCircle size={16} />
                          </button>
                          <button onClick={() => setModalMovimiento({ item, tipo: 'salida' })}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors" title="Registrar salida">
                            <ArrowDownCircle size={16} />
                          </button>
                          <div className="w-px h-4 bg-white/10 mx-1" />
                          <button onClick={() => setModalMaterial(item)}
                            className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-400 transition-colors" title="Editar">
                            <Edit2 size={16} />
                          </button>
                          {user?.rol === 'admin' && (
                            <button onClick={() => handleEliminar(item)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors" title="Eliminar">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </>)}
                        <button onClick={() => setModalHistorial(item)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Historial">
                          <History size={16} />
                        </button>
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

      {/* Modales */}
      <AnimatePresence key="inventario-modales">
        {modalMaterial !== null && (
          <ModalMaterial
            key="inventario-material-modal"
            item={modalMaterial === 'nuevo' ? null : modalMaterial}
            onClose={() => setModalMaterial(null)}
            onSave={fetchInventario}
          />
        )}
        {modalMovimiento && (
          <ModalMovimiento
            key="inventario-movimiento-modal"
            item={modalMovimiento.item}
            tipo={modalMovimiento.tipo}
            onClose={() => setModalMovimiento(null)}
            onSave={fetchInventario}
          />
        )}
        {modalHistorial && (
          <ModalHistorial
            key="inventario-historial-modal"
            item={modalHistorial}
            onClose={() => setModalHistorial(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}