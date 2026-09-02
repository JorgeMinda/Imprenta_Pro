import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../api/config';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Search, AlertCircle, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination, { usePagination } from '../components/Pagination';
import { useConfirm } from '../components/ConfirmModal';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio_base: number;
  stock: number;
  creado_en: string;
}

export default function Productos() {
  const { token } = useAuth();
  const { confirmar } = useConfirm();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProductos, setFilteredProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const pagination = usePagination(filteredProductos);
  const toastStyle = { background: '#1F2937', color: 'white', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '0.75rem' };
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentProducto, setCurrentProducto] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({ nombre: '', descripcion: '', precio_base: 0, stock: 0 });

  const fetchProductos = useCallback(async (isManualRefresh = false) => {
    let toastId: string | undefined;
    if (isManualRefresh) toastId = toast.loading('Actualizando catálogo...', { style: toastStyle });
    else setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/productos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al cargar productos');
      const data = await res.json();
      setProductos(data || []);
      setFilteredProductos(data || []);
      setError(null);
      if (isManualRefresh) toast.success('Catálogo actualizado', { id: toastId, style: toastStyle });
    } catch (err: any) {
      const errorMsg = err.message || 'Error de conexión';
      if (isManualRefresh) toast.error(errorMsg, { id: toastId, style: toastStyle });
      else setError(errorMsg);
    } finally {
      if (!isManualRefresh) setLoading(false);
    }
  }, [token]);

  useEffect(() => { if (token) fetchProductos(false); }, [token, fetchProductos]);

  useEffect(() => {
    if (busqueda.trim() === '') { setFilteredProductos(productos); return; }
    const term = busqueda.toLowerCase();
    setFilteredProductos(productos.filter(p =>
      p.nombre.toLowerCase().includes(term) || p.descripcion?.toLowerCase().includes(term)
    ));
  }, [busqueda, productos]);

  const openModal = (producto: Producto | null = null) => {
    setIsEdit(!!producto);
    setCurrentProducto(producto);
    setFormData(producto || { nombre: '', descripcion: '', precio_base: 0, stock: 0 });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading(isEdit ? 'Guardando cambios...' : 'Creando producto...', { style: toastStyle });
    try {
      const url = isEdit && currentProducto
        ? `${API_BASE}/api/productos/${currentProducto.id}`
        : `${API_BASE}/api/productos`;
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.msg || 'Error'); }
      toast.success(isEdit ? 'Producto actualizado' : 'Producto creado con éxito', { id: toastId, style: toastStyle });
      setShowModal(false);
      fetchProductos(false);
    } catch (err: any) { toast.error(err.message, { id: toastId, style: toastStyle }); }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmar({
      titulo:   'Eliminar producto',
      mensaje:  '¿Eliminar este producto? Esta acción no se puede deshacer.',
      variante: 'danger',
      labelOk:  'Eliminar',
    });
    if (!ok) return;
    const toastId = toast.loading('Eliminando producto...', { style: toastStyle });
    try {
      const res = await fetch(`${API_BASE}/api/productos/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Producto eliminado', { id: toastId, style: toastStyle });
      fetchProductos(false);
    } catch (err: any) { toast.error(err.message, { id: toastId, style: toastStyle }); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="flex space-x-2">
        {[0,0.1,0.2].map((d,i) => <div key={i} className="w-4 h-4 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${d}s` }} />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[70vh] flex-col gap-6">
      <div className="text-center p-12 bg-gray-900/40 border border-white/10 rounded-3xl">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-xl font-medium text-red-400 mb-6">{error}</p>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => fetchProductos(false)}
          className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-6 py-2.5 rounded-xl flex items-center gap-2 mx-auto">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </motion.button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Productos</h1>
          <p className="text-sm text-gray-400 mt-1">Catálogo de productos e inventario</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Buscar producto..." value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-900/40 border border-white/10 rounded-xl text-sm text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 transition-all shadow-lg" />
          </div>
          <div className="flex gap-3">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => fetchProductos(true)}
              className="flex items-center justify-center p-2.5 bg-gray-800/50 hover:bg-gray-700/80 border border-white/10 rounded-xl text-gray-300 hover:text-white transition-all">
              <RefreshCw className="w-5 h-5" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => openModal()}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20">
              <Plus className="w-5 h-5" /> Nuevo
            </motion.button>
          </div>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/40 border-b border-gray-700/50">
                {['ID','Nombre','Descripción','Stock','Precio Base','Acciones'].map(h => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h==='Acciones'?'text-right':''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredProductos.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-16 text-center text-gray-400 text-sm">No se encontraron productos.</td></tr>
              ) : pagination.paginated.map((prod, index) => (
                <motion.tr key={prod.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-white">#{prod.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{prod.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-400 max-w-[200px] truncate">{prod.descripcion || <span className="italic">Sin descripción</span>}</td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      prod.stock <= 5 ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                      prod.stock <= 10 ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'}`}>
                      {prod.stock <= 5 && <AlertCircle className="w-3.5 h-3.5 animate-pulse" />}
                      {prod.stock} {prod.stock <= 5 ? 'Crítico' : prod.stock <= 10 ? 'Bajo' : 'Unids.'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">${Number(prod.precio_base).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => openModal(prod)}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-all">
                        <Edit className="w-4 h-4 text-blue-400" />
                      </motion.button>
                      <div className="w-px h-6 bg-gray-700 mx-1" />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(prod.id)}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </motion.button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination total={pagination.total} page={pagination.page} pageSize={pagination.pageSize} onPageChange={pagination.setPage} onPageSizeChange={pagination.setPageSize} />
      </motion.div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-gray-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">{isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nombre *</label>
                  <input type="text" required value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="Ej. Folleto A5 Full Color" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Descripción</label>
                  <textarea value={formData.descripcion} onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                    rows={3} className="w-full px-4 py-2.5 bg-gray-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all resize-none"
                    placeholder="Detalles del producto..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Precio Base ($) *</label>
                    <input type="number" step="0.01" min="0" required value={formData.precio_base}
                      onChange={e => setFormData({ ...formData, precio_base: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Stock Inicial *</label>
                    <input type="number" min="0" required value={formData.stock}
                      onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-gray-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all" />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg">
                    {isEdit ? 'Guardar Cambios' : 'Crear Producto'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}