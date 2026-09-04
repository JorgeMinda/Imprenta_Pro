// src/pages/Cotizaciones.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import type { Cliente, Producto, ItemForm } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Trash2, Plus, X, Package, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination, { usePagination } from '../components/Pagination';
import { useConfirm } from '../components/ConfirmModal';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface ProductoDetalle {
  producto:        string;
  cantidad:        number;
  precio_unitario: number;
  subtotal:        number;
}

interface Cotizacion {
  id:        number;
  cliente:   string;
  total:     number;
  estado:    string;
  fecha:     string;
  productos: ProductoDetalle[] | null; // json_agg del backend
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const toastStyle = {
  background: '#1F2937', color: 'white',
  borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)',
};

function formatFecha(fecha?: string | null): string {
  if (!fecha) return '—';
  try {
    if (fecha.includes('-')) {
      const parts = fecha.split('T')[0].split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        return `${d}/${m}/${y}`;
      }
    }
    const d = new Date(fecha);
    return isNaN(d.getTime()) ? String(fecha) : d.toLocaleDateString('es-EC');
  } catch {
    return String(fecha || '—');
  }
}

function getStatusBadgeStyles(estado?: string | null) {
  const est = (estado || '').toLowerCase();
  switch (est) {
    case 'aprobada':  return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'rechazada': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'anulada':   return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    default:          return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  }
}

// Muestra los productos de una cotización de forma compacta
function ProductosList({ productos }: { productos: ProductoDetalle[] | null }) {
  const [open, setOpen] = useState(false);
  const items = (productos || []).filter(p => p && p.producto);

  if (items.length === 0) return <span className="text-gray-500 text-xs italic">—</span>;

  if (items.length === 1) {
    return (
      <div>
        <p className="text-sm text-gray-200 font-medium">{items[0].producto}</p>
        <p className="text-xs text-gray-400">x{items[0].cantidad || 1} · ${Number(items[0].precio_unitario || 0).toFixed(2)}</p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-sm text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
      >
        {items.length} productos
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1 bg-gray-900/80 p-2.5 rounded-lg border border-white/10 shadow-lg">
          {items.map((p, i) => (
            <div key={i} className="text-xs text-gray-300 flex justify-between items-center gap-3">
              <span className="font-medium truncate max-w-[130px]">• {p.producto}</span>
              <span className="text-gray-400 whitespace-nowrap">x{p.cantidad || 1} (${Number(p.precio_unitario || 0).toFixed(2)})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────
export default function Cotizaciones() {
  const { user } = useAuth();

  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [clientes,     setClientes]     = useState<Cliente[]>([]);
  const [productos,    setProductos]    = useState<Producto[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);

  // Soporte multi-producto en el form
  const itemVacio = (): ItemForm => ({ producto_id: '', cantidad: 1, precio_unitario: 0 });
  const [clienteId,   setClienteId]   = useState('');
  const [items,       setItems]       = useState<ItemForm[]>([itemVacio()]);

  const isAdminOrVendedor = ['admin', 'vendedor', 'secretaria'].includes(user?.rol || '');
  const { confirmar } = useConfirm();
  const isAdmin = user?.rol === 'admin';
  const pagination = usePagination(cotizaciones);

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    try {
      const [cotizacionesData, clientesData, productosData] = await Promise.all([
        apiClient.get<Cotizacion[]>('/api/cotizaciones'),
        apiClient.get<Cliente[]>('/api/clientes'),
        apiClient.get<Producto[]>('/api/productos'),
      ]);
      setCotizaciones(cotizacionesData || []);
      setClientes(clientesData || []);
      setProductos(productosData || []);
    } catch {
      toast.error('Error al cargar los datos', { style: toastStyle });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── Manejo del form multi-producto ───────────────────────────────────────
  const updateItem = (idx: number, field: keyof ItemForm, value: string | number) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      // Auto-rellenar precio al seleccionar producto
      if (field === 'producto_id') {
        const prod = productos.find(p => p.id === Number(value));
        if (prod) next[idx].precio_unitario = prod.precio_base;
      }
      return next;
    });
  };

  const addItem    = () => setItems(p => [...p, itemVacio()]);
  const removeItem = (idx: number) => setItems(p => p.filter((_, i) => i !== idx));

  const totalForm = items.reduce((s, i) => s + i.cantidad * i.precio_unitario, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId) return toast.error('Selecciona un cliente', { style: toastStyle });
    if (items.some(i => !i.producto_id))
      return toast.error('Selecciona producto en todos los ítems', { style: toastStyle });

    try {
      await apiClient.post('/api/cotizaciones', {
        cliente_id: Number(clienteId),
        productos: items.map(i => ({
          producto_id:     Number(i.producto_id),
          cantidad:        i.cantidad,
          precio_unitario: i.precio_unitario,
        })),
      });

      setShowForm(false);
      setClienteId('');
      setItems([itemVacio()]);
      fetchData();
      toast.success('Cotización creada exitosamente 📝', { style: toastStyle });
    } catch (err: any) {
      toast.error(err.message || 'Error al crear cotización', { style: toastStyle });
    }
  };

  // ── Acciones ─────────────────────────────────────────────────────────────
  const handleAprobar = async (id: number) => {
    const ok = await confirmar({
      titulo:   'Aprobar cotización',
      mensaje:  '¿Aprobar esta cotización y crear una orden de trabajo automáticamente?',
      variante: 'success',
      labelOk:  'Aprobar',
    });
    if (!ok) return;
    try {
      await apiClient.post(`/api/cotizaciones/${id}/aprobar`);
      fetchData();
      toast.success('Cotización aprobada y orden creada 🎉', { style: toastStyle });
    } catch (err: any) {
      toast.error(err.message || 'Error al aprobar', { style: toastStyle });
    }
  };

  const handleRechazar = async (id: number) => {
    const ok = await confirmar({
      titulo:   'Rechazar cotización',
      mensaje:  '¿Estás seguro de rechazar esta cotización?',
      variante: 'warning',
      labelOk:  'Rechazar',
    });
    if (!ok) return;
    try {
      await apiClient.patch(`/api/cotizaciones/${id}/rechazar`);
      fetchData();
      toast.success('Cotización rechazada 🚫', { style: toastStyle });
    } catch (err: any) {
      toast.error(err.message || 'Error al rechazar', { style: toastStyle });
    }
  };

  const handleEliminar = async (id: number) => {
    const ok = await confirmar({
      titulo:   'Eliminar cotización',
      mensaje:  '¿Eliminar esta cotización? No se puede deshacer.',
      variante: 'danger',
      labelOk:  'Eliminar',
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/api/cotizaciones/${id}`);
      setCotizaciones(prev => prev.filter(c => c.id !== id));
      toast.success('Cotización eliminada 🗑️', { style: toastStyle });
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar', { style: toastStyle });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Cotizaciones</h1>
          <p className="text-sm text-gray-400 mt-1">Gestiona y administra las cotizaciones de clientes</p>
        </div>
        {isAdminOrVendedor && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/30 font-medium"
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showForm ? 'Cancelar' : 'Nueva Cotización'}
          </motion.button>
        )}
      </div>

      {/* Formulario */}
      <AnimatePresence>
        {showForm && isAdminOrVendedor && (
          <motion.div
            initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="glass p-6 shadow-2xl"
          >
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-2 h-6 bg-indigo-500 rounded-full inline-block" />
              Crear Nueva Cotización
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Cliente */}
              <div>
                <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1.5 font-medium">Cliente *</label>
                <select value={clienteId} onChange={e => setClienteId(e.target.value)} required
                  className="w-full bg-gray-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition-all">
                  <option value="">Seleccionar cliente…</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>

              {/* Productos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400 uppercase tracking-wide font-medium">Productos *</label>
                  <button type="button" onClick={addItem}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                    <Plus className="w-3.5 h-3.5" /> Agregar ítem
                  </button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end bg-gray-800/40 p-3 rounded-xl border border-white/5">
                    {/* Producto */}
                    <div className="col-span-5">
                      {idx === 0 && <p className="text-xs text-gray-500 mb-1">Producto</p>}
                      <select value={item.producto_id}
                        onChange={e => updateItem(idx, 'producto_id', e.target.value)} required
                        className="w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all">
                        <option value="">Seleccionar…</option>
                        {productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                    {/* Cantidad */}
                    <div className="col-span-2">
                      {idx === 0 && <p className="text-xs text-gray-500 mb-1">Cant.</p>}
                      <input type="number" min="1" value={item.cantidad}
                        onChange={e => updateItem(idx, 'cantidad', Number(e.target.value))}
                        className="w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all" />
                    </div>
                    {/* Precio */}
                    <div className="col-span-3">
                      {idx === 0 && <p className="text-xs text-gray-500 mb-1">Precio unit. ($)</p>}
                      <input type="number" min="0" step="0.01" value={item.precio_unitario}
                        onChange={e => updateItem(idx, 'precio_unitario', Number(e.target.value))}
                        className="w-full bg-gray-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 outline-none transition-all" />
                    </div>
                    {/* Subtotal + eliminar */}
                    <div className="col-span-2 flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold text-indigo-300">
                        ${(item.cantidad * item.precio_unitario).toFixed(2)}
                      </span>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)}
                          className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex justify-end pt-1">
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-5 py-2.5 flex items-center gap-3">
                    <span className="text-sm text-gray-400">Total estimado:</span>
                    <span className="text-xl font-black text-indigo-300">${totalForm.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white px-8 py-3 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 transition-all"
                >
                  Guardar Cotización
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabla */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-strong overflow-hidden shadow-2xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-800/40 border-b border-white/5">
                {['Fecha','Cliente','Productos','Total','Estado','Acciones'].map(h => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider
                    ${h === 'Total' || h === 'Acciones' ? 'text-right' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    {[1,2,3,4,5,6].map(j => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-700/60 rounded animate-pulse" style={{ width: `${50 + j * 8}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : cotizaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500">No hay cotizaciones registradas aún.</p>
                  </td>
                </tr>
              ) : (
                pagination.paginated.map(c => (
                  <tr key={c.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4 text-sm text-gray-300 whitespace-nowrap">
                      {formatFecha(c.fecha)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-white whitespace-nowrap">
                      {c.cliente || 'Consumidor Final'}
                    </td>
                    {/* ── COLUMNA CORREGIDA: lee c.productos[] en lugar de c.producto ── */}
                    <td className="px-6 py-4 min-w-[180px]">
                      <ProductosList productos={c.productos} />
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-white text-right whitespace-nowrap">
                      ${Number(c.total || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs font-bold rounded-full border ${getStatusBadgeStyles(c.estado)}`}>
                        {c.estado ? c.estado.charAt(0).toUpperCase() + c.estado.slice(1) : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex justify-end items-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                        {isAdminOrVendedor && (c.estado || '').toLowerCase() === 'pendiente' && (
                          <>
                            <button onClick={() => handleAprobar(c.id)}
                              className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-emerald-400 transition-colors" title="Aprobar">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleRechazar(c.id)}
                              className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors" title="Rechazar">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {isAdmin && (
                          <button onClick={() => handleEliminar(c.id)}
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
    </div>
  );
}