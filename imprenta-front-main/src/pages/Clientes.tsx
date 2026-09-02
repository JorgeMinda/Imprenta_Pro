import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import type { Cliente } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, Search, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination, { usePagination } from '../components/Pagination';
import { useConfirm } from '../components/ConfirmModal';

export default function Clientes() {
  const { confirmar } = useConfirm();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const pagination = usePagination(filteredClientes);
  const [showModal, setShowModal] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentCliente, setCurrentCliente] = useState<Cliente | null>(null);
  const [formData, setFormData] = useState({ nombre: '', telefono: '', direccion: '', email: '' });

  useEffect(() => { fetchClientes(); }, []);

  useEffect(() => {
    if (busqueda.trim() === '') { setFilteredClientes(clientes); return; }
    const term = busqueda.toLowerCase();
    setFilteredClientes(clientes.filter(c =>
      c.nombre.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term) ||
      c.telefono?.includes(term)
    ));
  }, [busqueda, clientes]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Cliente[]>('/api/clientes');
      setClientes(data || []);
      setFilteredClientes(data || []);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  const openModal = (cliente: Cliente | null = null) => {
    setIsEdit(!!cliente);
    setCurrentCliente(cliente);
    setFormData(cliente || { nombre: '', telefono: '', direccion: '', email: '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEdit && currentCliente) {
        await apiClient.put(`/api/clientes/${currentCliente.id}`, formData);
      } else {
        await apiClient.post('/api/clientes', formData);
      }
      setShowModal(false);
      fetchClientes();
      toast.success(isEdit ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente', {
        icon: '🎉', style: { background: '#10B981', color: 'white', borderRadius: '0.75rem' },
      });
    } catch (err: any) {
      toast.error(err.message || 'Error al procesar la solicitud', {
        style: { background: '#EF4444', color: 'white', borderRadius: '0.75rem' },
      });
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmar({
      titulo:   'Eliminar cliente',
      mensaje:  '¿Eliminar este cliente? Esta acción no se puede deshacer.',
      variante: 'danger',
      labelOk:  'Eliminar',
    });
    if (!ok) return;
    try {
      await apiClient.delete(`/api/clientes/${id}`);
      fetchClientes();
      toast.success('Cliente eliminado', {
        icon: '🗑️', style: { background: '#10B981', color: 'white', borderRadius: '0.75rem' },
      });
    } catch (err: any) {
      toast.error(err.message || 'No se pudo eliminar el cliente', {
        style: { background: '#EF4444', color: 'white', borderRadius: '0.75rem' },
      });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="flex space-x-2">
        {[0,0.1,0.2].map((d,i) => <div key={i} className="w-4 h-4 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${d}s` }} />)}
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center p-12 bg-gray-900/40 border border-white/10 rounded-3xl">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-xl font-medium text-red-400">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Directorio de Clientes</h1>
          <p className="text-sm text-gray-400 mt-1">Gestiona la información de tus contactos</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Buscar por nombre, email o teléfono..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 glass-input text-sm shadow-lg"
            />
          </div>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-5 h-5" /> Nuevo Cliente
          </motion.button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/40 border-b border-gray-700/50">
                {['ID','Nombre','Contacto','Dirección','Acciones'].map(h => (
                  <th key={h} className={`px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h==='Acciones'?'text-right':''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filteredClientes.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-16 text-center text-gray-400 text-sm">No se encontraron clientes.</td></tr>
              ) : pagination.paginated.map((cliente, index) => (
                <motion.tr key={cliente.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="hover:bg-gray-800/30 transition-colors group">
                  <td className="px-6 py-4 text-sm font-medium text-white">#{cliente.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{cliente.nombre}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <div className="flex flex-col">
                      <span>{cliente.telefono || '-'}</span>
                      <span className="text-xs text-gray-500">{cliente.email || '-'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">
                    <span className="truncate block max-w-[200px]">{cliente.direccion || 'No especificada'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => openModal(cliente)}
                        className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-all">
                        <Edit className="w-4 h-4 text-blue-400" />
                      </motion.button>
                      <div className="w-px h-6 bg-gray-700 mx-1" />
                      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        onClick={() => handleDelete(cliente.id)}
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
              onClick={() => setShowModal(false)} className="absolute inset-0 glass-overlay" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg glass-float overflow-hidden">
              <div className="flex justify-between items-center p-6 border-b border-gray-800">
                <h3 className="text-xl font-bold text-white">{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Nombre Completo *</label>
                  <input type="text" required value={formData.nombre}
                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="Ej. Juan Pérez" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
                    <input type="text" value={formData.telefono}
                      onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="+593 999 999 999" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
                    <input type="email" value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 bg-gray-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all"
                      placeholder="ejemplo@correo.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Dirección</label>
                  <input type="text" value={formData.direccion}
                    onChange={e => setFormData({ ...formData, direccion: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all"
                    placeholder="Av. Principal y Secundaria" />
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors">
                    Cancelar
                  </button>
                  <button type="submit"
                    className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-lg">
                    {isEdit ? 'Guardar Cambios' : 'Crear Cliente'}
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