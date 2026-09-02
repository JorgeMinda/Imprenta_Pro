// src/pages/Facturacion.tsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import { useConfirm } from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Receipt, Plus, Search, X, CheckCircle, XCircle,
  Trash2, RefreshCw, TrendingUp, Clock, Ban
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination, { usePagination } from '../components/Pagination';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Factura {
  id:                  number;
  numero:              string;
  cliente:             string | null;
  cotizacion_id:       number | null;
  subtotal:            number;
  impuesto_porcentaje: number;
  impuesto_valor:      number;
  total:               number;
  estado:              'pendiente' | 'pagada' | 'anulada';
  observaciones:       string | null;
  fecha_emision:       string;
}

interface Cotizacion {
  id:     number;
  cliente: string;
  total:  number;
}

const toastStyle = {
  background: '#1F2937', color: 'white',
  borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)',
};

const ESTADO_CFG = {
  pendiente: { color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',   label: 'Pendiente', icon: Clock      },
  pagada:    { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', label: 'Pagada',  icon: CheckCircle },
  anulada:   { color: 'bg-red-500/10 text-red-400 border-red-500/30',         label: 'Anulada',   icon: Ban         },
};

function EstadoBadge({ estado }: { estado: keyof typeof ESTADO_CFG }) {
  const cfg  = ESTADO_CFG[estado] ?? ESTADO_CFG.pendiente;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

// ── Modal nueva factura ───────────────────────────────────────────────────────
function ModalFactura({ cotizaciones, onClose, onSave }: {
  cotizaciones: Cotizacion[];
  onClose: () => void;
  onSave:  () => void;
}) {
  const [form, setForm] = useState({
    cotizacion_id:       '',
    impuesto_porcentaje: 15,
    observaciones:       '',
  });
  const [saving, setSaving] = useState(false);

  const cotSel = cotizaciones.find(c => c.id === Number(form.cotizacion_id));
  const subtotal    = cotSel ? Number(cotSel.total) : 0;
  const impuesto    = subtotal * (form.impuesto_porcentaje / 100);
  const total       = subtotal + impuesto;

  const handleSubmit = async () => {
    if (!form.cotizacion_id)
      return toast.error('Selecciona una cotización', { style: toastStyle });

    setSaving(true);
    try {
      const data = await apiClient.post<{ factura: { numero: string } }>('/api/facturacion', {
        cotizacion_id:       Number(form.cotizacion_id),
        impuesto_porcentaje: form.impuesto_porcentaje,
        observaciones:       form.observaciones || null,
      });
      toast.success(`Factura ${data.factura.numero} creada ✅`, { style: toastStyle });
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
      <motion.div
        initial={{ scale: 0.9, y: 30, opacity: 0 }}
        animate={{ scale: 1,   y: 0,  opacity: 1 }}
        exit={{   scale: 0.9, y: 30, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-md glass-float overflow-hidden"
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
              <Receipt className="w-5 h-5 text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-white">Nueva Factura</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Cotización */}
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">
              Cotización aprobada *
            </label>
            <select value={form.cotizacion_id}
              onChange={e => setForm(p => ({ ...p, cotizacion_id: e.target.value }))}
              className="w-full bg-gray-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all"
            >
              <option value="">Seleccionar cotización…</option>
              {cotizaciones.map(c => (
                <option key={c.id} value={c.id}>
                  {c.cliente} — ${Number(c.total).toFixed(2)}
                </option>
              ))}
            </select>
            {cotizaciones.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">No hay cotizaciones aprobadas sin facturar</p>
            )}
          </div>

          {/* IVA */}
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">IVA (%)</label>
            <input type="number" min="0" max="100" value={form.impuesto_porcentaje}
              onChange={e => setForm(p => ({ ...p, impuesto_porcentaje: Number(e.target.value) }))}
              className="w-full bg-gray-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none transition-all"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">Observaciones</label>
            <textarea rows={2} value={form.observaciones}
              onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
              placeholder="Notas adicionales…"
              className="w-full bg-gray-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 outline-none transition-all resize-none"
            />
          </div>

          {/* Preview totales */}
          {cotSel && (
            <div className="bg-gray-800/40 border border-white/5 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Subtotal</span><span className="text-white">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>IVA ({form.impuesto_porcentaje}%)</span>
                <span className="text-amber-400">${impuesto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-white/10 pt-2">
                <span className="text-white">Total</span>
                <span className="text-emerald-400 text-lg">${total.toFixed(2)}</span>
              </div>
            </div>
          )}

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleSubmit} disabled={saving || !form.cotizacion_id}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
              disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg"
          >
            {saving ? 'Creando…' : 'Crear Factura'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function Facturacion() {
  const { user } = useAuth();
  const { confirmar }   = useConfirm();

  const [facturas,      setFacturas]      = useState<Factura[]>([]);
  const [cotizaciones,  setCotizaciones]  = useState<Cotizacion[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [busqueda,      setBusqueda]      = useState('');
  const [showModal,     setShowModal]     = useState(false);
  const [filtroEstado,  setFiltroEstado]  = useState<string>('todos');

  const isAdminOrVendedor = ['admin','vendedor'].includes(user?.rol || '');
  const isAdmin           = user?.rol === 'admin';
   
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [facturasData, cotizacionesData] = await Promise.all([
        apiClient.get<Factura[]>('/api/facturacion'),
        apiClient.get<Cotizacion[]>('/api/cotizaciones'),
      ]);
      setFacturas(facturasData);
      const cots: any[] = cotizacionesData;
      setCotizaciones(
        cots
          .filter(c => c.estado === 'aprobada')
          .map(c => ({ id: c.id, cliente: c.cliente, total: c.total }))
      );
    } catch {
      toast.error('Error al cargar facturas', { style: toastStyle });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Filtros ────────────────────────────────────────────────────────────────
  const filtered = facturas.filter(f => {
    const matchBusqueda =
      f.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      (f.cliente || '').toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || f.estado === filtroEstado;
    return matchBusqueda && matchEstado;
  });
  const pagination = usePagination(filtered);

  // ── Acciones ───────────────────────────────────────────────────────────────
  const cambiarEstado = async (f: Factura, estado: 'pagada' | 'anulada') => {
    const cfg = estado === 'pagada'
      ? { titulo: 'Marcar como pagada', mensaje: `¿Confirmar pago de la factura ${f.numero}?`, variante: 'success' as const, labelOk: 'Marcar pagada' }
      : { titulo: 'Anular factura',     mensaje: `¿Anular la factura ${f.numero}? No se puede deshacer.`, variante: 'warning' as const, labelOk: 'Anular' };

    const ok = await confirmar(cfg);
    if (!ok) return;

    try {
      await apiClient.patch(`/api/facturacion/${f.id}`, { estado });
      toast.success(estado === 'pagada' ? 'Factura marcada como pagada ✅' : 'Factura anulada', { style: toastStyle });
      fetchData();
    } catch (err: any) {
      toast.error(err.message, { style: toastStyle });
    }
  };

  const handleEliminar = async (f: Factura) => {
    const ok = await confirmar({
      titulo:   'Eliminar factura',
      mensaje:  `¿Eliminar la factura ${f.numero}? Solo se pueden eliminar facturas anuladas.`,
      variante: 'danger',
      labelOk:  'Eliminar',
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/api/facturacion/${f.id}`);
      toast.success('Factura eliminada', { style: toastStyle });
      fetchData();
    } catch (err: any) {
      toast.error(err.message, { style: toastStyle });
    }
  };

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const totalCobrado   = facturas.filter(f => f.estado === 'pagada').reduce((s, f) => s + Number(f.total), 0);
  const totalPendiente = facturas.filter(f => f.estado === 'pendiente').reduce((s, f) => s + Number(f.total), 0);
  const totalAnulado   = facturas.filter(f => f.estado === 'anulada').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Facturación</h1>
          <p className="text-sm text-gray-400 mt-1">Gestión de facturas y cobros</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchData}
            className="p-2.5 bg-gray-800/50 border border-white/10 rounded-xl text-gray-400 hover:text-white transition">
            <RefreshCw className="w-4 h-4" />
          </button>
          {isAdminOrVendedor && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600
                hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg text-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Nueva Factura
            </motion.button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total cobrado',   value: `$${totalCobrado.toFixed(2)}`,   color: '#10B981', icon: TrendingUp  },
          { label: 'Por cobrar',      value: `$${totalPendiente.toFixed(2)}`, color: '#F59E0B', icon: Clock       },
          { label: 'Total facturas',  value: facturas.length,                  color: '#6366F1', icon: Receipt     },
          { label: 'Anuladas',        value: totalAnulado,                     color: '#EF4444', icon: Ban         },
        ].map((k, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            className="glass p-5 flex items-center gap-4"
          >
            <div className="p-2.5 rounded-xl shrink-0"
              style={{ background: `${k.color}20`, border: `1px solid ${k.color}30` }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xl font-black text-white">{k.value}</p>
              <p className="text-xs text-gray-400">{k.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Buscar por número o cliente…"
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2 glass-input text-sm"
          />
        </div>
        <div className="flex gap-2">
          {['todos','pendiente','pagada','anulada'].map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all capitalize
                ${filtroEstado === e
                  ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  : 'bg-gray-800/40 text-gray-400 border-white/5 hover:text-white'}`}
            >
              {e === 'todos' ? 'Todas' : e}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="glass-strong overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/40 border-b border-white/5">
                {['N° Factura','Cliente','Subtotal','IVA','Total','Estado','Fecha','Acciones'].map(h => (
                  <th key={h} className={`px-5 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider
                    ${h === 'Acciones' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-5 py-4">
                      <div className="h-4 bg-gray-700/60 rounded animate-pulse" />
                    </td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center">
                    <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">
                      {facturas.length === 0 ? 'No hay facturas aún. ¡Crea la primera!' : 'Sin resultados para esta búsqueda.'}
                    </p>
                  </td>
                </tr>
              ) : (
                pagination.paginated.map(f => (
                  <tr key={f.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs text-blue-400 font-bold">{f.numero}</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-white">{f.cliente || '—'}</td>
                    <td className="px-5 py-4 text-sm text-gray-300">${Number(f.subtotal).toFixed(2)}</td>
                    <td className="px-5 py-4 text-sm text-amber-400">
                      {f.impuesto_porcentaje}% · ${Number(f.impuesto_valor).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-emerald-400">${Number(f.total).toFixed(2)}</td>
                    <td className="px-5 py-4"><EstadoBadge estado={f.estado} /></td>
                    <td className="px-5 py-4 text-sm text-gray-400">{f.fecha_emision}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {isAdminOrVendedor && f.estado === 'pendiente' && (
                          <>
                            <button onClick={() => cambiarEstado(f, 'pagada')}
                              className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors" title="Marcar pagada">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => cambiarEstado(f, 'anulada')}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors" title="Anular">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isAdmin && f.estado === 'anulada' && (
                          <button onClick={() => handleEliminar(f)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
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

      <AnimatePresence key="factura-modal">
        {showModal && (
          <ModalFactura
            key="factura-modal-body"
            cotizaciones={cotizaciones}
            onClose={() => setShowModal(false)}
            onSave={fetchData}
          />
        )}
      </AnimatePresence>
    </div>
  );
}