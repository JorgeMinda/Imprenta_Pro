// src/pages/Ordenes.tsx
import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle, Clock, Package, Filter, Search,
  AlertCircle, Eye, FileText, X, Calendar, User,
  Hash, MessageSquare, Download, Loader2, Paintbrush
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Orden {
  id: number;
  cotizacion_id: number;
  cliente: string;
  estado: string;
  fecha_inicio: string;
  fecha_entrega: string | null;
  observaciones: string | null;
}

const toastStyle = {
  background: '#1F2937',
  color: 'white',
  borderRadius: '0.75rem',
  border: '1px solid rgba(255,255,255,0.1)',
};

// ─── Estados reales de la BD ──────────────────────────────────────────────────
// La BD guarda: 'diseño' | 'en proceso' | 'terminada' | 'entregada'  (minúsculas)
const ESTADOS = [
  { value: 'diseño',     label: 'Diseño',      color: 'bg-violet-500/10 text-violet-400 border-violet-500/30' },
  { value: 'en proceso', label: 'En Proceso',  color: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  { value: 'terminada',  label: 'Terminada',   color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  { value: 'entregada',  label: 'Entregada',   color: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
];

function getEstadoConfig(estado: string) {
  return (
    ESTADOS.find(e => e.value === estado?.toLowerCase()) ?? {
      value: estado,
      label: estado ?? '—',
      color: 'bg-gray-500/10 text-gray-400 border-gray-500/30',
    }
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = getEstadoConfig(estado);
  return (
    <span className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Modal de detalle ─────────────────────────────────────────────────────────
function ModalDetalle({
  orden, onClose, onCambiarEstado, onGenerarFactura, generandoPDF,
}: {
  orden: Orden;
  onClose: () => void;
  onCambiarEstado: (id: number, estado: string) => void;
  onGenerarFactura: (id: number) => void;
  generandoPDF: boolean;
}) {
  const estadoActual = orden.estado?.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 40 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 40 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-2xl bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30">
              <FileText className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Orden de Trabajo</h3>
              <p className="text-sm text-indigo-400 font-mono">#{orden.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 rounded-lg hover:bg-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Estado destacado */}
          <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-white/5">
            <span className="text-sm text-gray-400 font-medium">Estado actual</span>
            <EstadoBadge estado={orden.estado} />
          </div>

          {/* Grid datos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoCard icon={<User className="w-4 h-4" />}     label="Cliente"         value={orden.cliente || 'Consumidor Final'} />
            <InfoCard icon={<Hash className="w-4 h-4" />}     label="Cotización"      value={`#${orden.cotizacion_id}`} />
            <InfoCard
              icon={<Calendar className="w-4 h-4" />}
              label="Fecha de Inicio"
              value={orden.fecha_inicio ? new Date(orden.fecha_inicio).toLocaleDateString('es-EC', { dateStyle: 'medium' }) : '—'}
            />
            <InfoCard
              icon={<Calendar className="w-4 h-4" />}
              label="Fecha de Entrega"
              value={orden.fecha_entrega ? new Date(orden.fecha_entrega).toLocaleDateString('es-EC', { dateStyle: 'medium' }) : 'Pendiente'}
              highlight={!orden.fecha_entrega}
            />
          </div>

          {/* Observaciones */}
          <div className="p-4 bg-gray-800/40 rounded-xl border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-400">Observaciones</span>
            </div>
            <p className="text-white text-sm leading-relaxed">
              {orden.observaciones?.trim()
                ? orden.observaciones
                : <span className="text-gray-500 italic">Sin observaciones registradas.</span>}
            </p>
          </div>

          {/* Cambiar estado desde modal */}
          <div className="space-y-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Cambiar estado</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ESTADOS.map(e => (
                <button
                  key={e.value}
                  onClick={() => onCambiarEstado(orden.id, e.value)}
                  disabled={estadoActual === e.value}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all
                    ${estadoActual === e.value
                      ? `${e.color} cursor-default ring-2 ring-white/10`
                      : 'bg-gray-800/60 text-gray-400 border-white/5 hover:border-white/20 hover:text-white'
                    }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botón Factura */}
          {estadoActual === 'entregada' ? (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => onGenerarFactura(orden.id)}
              disabled={generandoPDF}
              className="w-full flex items-center justify-center gap-3 py-3 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-900/30"
            >
              {generandoPDF
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Generando PDF…</>
                : <><Download className="w-5 h-5" /> Descargar Factura PDF</>}
            </motion.button>
          ) : (
            <p className="text-center text-xs text-gray-500 italic">
              La factura se habilita cuando el estado sea{' '}
              <span className="text-blue-400 font-semibold">Entregada</span>.
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function InfoCard({ icon, label, value, highlight = false }: {
  icon: React.ReactNode; label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="p-4 bg-gray-800/40 rounded-xl border border-white/5 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-base font-semibold ${highlight ? 'text-amber-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Ordenes() {
  const [ordenes, setOrdenes]                 = useState<Orden[]>([]);
  const [filteredOrdenes, setFilteredOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [error, setError]                     = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado]       = useState('todas');
  const [busqueda, setBusqueda]               = useState('');
  const [selectedOrden, setSelectedOrden]     = useState<Orden | null>(null);
  const [generandoPDF, setGenerandoPDF]       = useState(false);

  const fetchOrdenes = async () => {
    try {
      const data = await apiClient.get<Orden[]>('/api/ordenes_trabajo');
      setOrdenes(data || []);
      setFilteredOrdenes(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrdenes(); }, []);

  useEffect(() => {
    let result = [...ordenes];
    if (filtroEstado !== 'todas')
      result = result.filter(o => o.estado?.toLowerCase() === filtroEstado);
    if (busqueda.trim()) {
      const term = busqueda.toLowerCase();
      result = result.filter(o =>
        (o.cliente?.toLowerCase() || '').includes(term) ||
        String(o.cotizacion_id).includes(term) ||
        String(o.id).includes(term)
      );
    }
    setFilteredOrdenes(result);
  }, [filtroEstado, busqueda, ordenes]);

  const handleCambiarEstado = async (id: number, nuevoEstado: string) => {
    const updatePromise = async () => {
      await apiClient.patch(`/api/ordenes_trabajo/${id}`, { estado: nuevoEstado });
      setOrdenes(prev => prev.map(o => o.id === id ? { ...o, estado: nuevoEstado } : o));
      setSelectedOrden(prev => prev?.id === id ? { ...prev, estado: nuevoEstado } : prev);
    };
    toast.promise(updatePromise(), {
      loading: 'Actualizando…',
      success: `Orden #${id} → ${getEstadoConfig(nuevoEstado).label}`,
      error: 'Error al actualizar',
    }, { style: toastStyle });
  };

  const handleGenerarFactura = async (ordenId: number) => {
    setGenerandoPDF(true);
    const toastId = toast.loading('Generando factura PDF…', { style: toastStyle });
    try {
      const blob = await apiClient.blob(`/api/facturas/orden/${ordenId}`);
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `factura-orden-${ordenId}.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Factura descargada ✅', { id: toastId, style: toastStyle });
    } catch (err: any) {
      toast.error(err.message || 'Error al generar factura', { id: toastId, style: toastStyle });
    } finally {
      setGenerandoPDF(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="flex space-x-2">
        {[0, 0.1, 0.2].map((d, i) => (
          <div key={i} className="w-4 h-4 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${d}s` }} />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center p-8 bg-red-500/10 border border-red-500/20 rounded-3xl">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-400 font-medium">{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 text-sm text-white underline">Reintentar</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Órdenes de Trabajo</h1>
          <p className="text-sm text-gray-400 mt-1">Control de producción en tiempo real</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar por cliente, ID u orden..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900/40 border border-white/10 rounded-xl text-white focus:border-indigo-500 outline-none transition-all"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-900/40 border border-white/10 rounded-xl px-3 py-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="bg-transparent text-sm text-gray-200 outline-none cursor-pointer"
            >
              <option value="todas" className="bg-gray-900">Todos los estados</option>
              {ESTADOS.map(e => (
                <option key={e.value} value={e.value} className="bg-gray-900">{e.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/40 border-b border-white/5">
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Cotización</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-400 uppercase text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrdenes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">No se encontraron resultados</td>
                </tr>
              ) : (
                filteredOrdenes.map(orden => (
                  <tr key={orden.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-indigo-400">#{orden.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">Cot. {orden.cotizacion_id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-white">{orden.cliente || 'Consumidor Final'}</td>
                    <td className="px-6 py-4"><EstadoBadge estado={orden.estado} /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-1">
                        <button onClick={() => handleCambiarEstado(orden.id, 'diseño')}
                          className="p-1.5 hover:bg-violet-500/20 rounded-lg text-violet-400 transition-colors" title="→ Diseño">
                          <Paintbrush size={16} />
                        </button>
                        <button onClick={() => handleCambiarEstado(orden.id, 'en proceso')}
                          className="p-1.5 hover:bg-amber-500/20 rounded-lg text-amber-500 transition-colors" title="→ En Proceso">
                          <Clock size={16} />
                        </button>
                        <button onClick={() => handleCambiarEstado(orden.id, 'terminada')}
                          className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-emerald-500 transition-colors" title="→ Terminada">
                          <CheckCircle size={16} />
                        </button>
                        <button onClick={() => handleCambiarEstado(orden.id, 'entregada')}
                          className="p-1.5 hover:bg-blue-500/20 rounded-lg text-blue-500 transition-colors" title="→ Entregada">
                          <Package size={16} />
                        </button>

                        <div className="w-px h-4 bg-white/10 mx-1" />

                        {orden.estado?.toLowerCase() === 'entregada' && (
                          <button onClick={() => handleGenerarFactura(orden.id)} disabled={generandoPDF}
                            className="p-1.5 hover:bg-purple-500/20 rounded-lg text-purple-400 transition-colors disabled:opacity-50"
                            title="Descargar Factura PDF">
                            <FileText size={16} />
                          </button>
                        )}

                        <button onClick={() => setSelectedOrden(orden)}
                          className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                          title="Ver detalle">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {selectedOrden && (
          <ModalDetalle
            orden={selectedOrden}
            onClose={() => setSelectedOrden(null)}
            onCambiarEstado={handleCambiarEstado}
            onGenerarFactura={handleGenerarFactura}
            generandoPDF={generandoPDF}
          />
        )}
      </AnimatePresence>
    </div>
  );
}