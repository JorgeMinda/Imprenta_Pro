import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Search, RefreshCw, Eye, X,
  FileSpreadsheet, User, CheckCircle2,
  Trash2, Edit, Plus, AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';
import type { AuditLog, AuditStats } from '../types';

const toastStyle = {
  background: '#1F2937',
  color: 'white',
  borderRadius: '0.75rem',
  border: '1px solid rgba(255,255,255,0.1)',
};

export default function Auditoria() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filtroModulo, setFiltroModulo] = useState('todos');
  const [filtroAccion, setFiltroAccion] = useState('todos');
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Modal de Detalle
  const [logSeleccionado, setLogSeleccionado] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtroModulo !== 'todos') params.append('modulo', filtroModulo);
      if (filtroAccion !== 'todos') params.append('accion', filtroAccion);
      if (filtroFechaInicio) params.append('fechaInicio', filtroFechaInicio);
      if (filtroFechaFin) params.append('fechaFin', filtroFechaFin);
      if (busqueda.trim()) params.append('busqueda', busqueda.trim());

      const data = await apiClient.get<{ logs: AuditLog[]; total: number }>(`/api/auditoria?${params.toString()}`);
      setLogs(data?.logs || []);
      setTotal(data?.total || 0);
    } catch {
      toast.error('Error al cargar registros de auditoría', { style: toastStyle });
    }
  }, [filtroModulo, filtroAccion, filtroFechaInicio, filtroFechaFin, busqueda]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiClient.get<AuditStats>('/api/auditoria/stats');
      setStats(data);
    } catch {
      /* */
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchLogs(), fetchStats()]);
    setLoading(false);
  }, [fetchLogs, fetchStats]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getAccionBadge = (accion: string) => {
    switch (accion.toUpperCase()) {
      case 'CREAR':
        return { color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30', icon: Plus, label: 'CREAR' };
      case 'EDITAR':
        return { color: 'bg-blue-500/10 text-blue-400 border-blue-500/30', icon: Edit, label: 'EDITAR' };
      case 'DESACTIVAR':
        return { color: 'bg-amber-500/10 text-amber-400 border-amber-500/30', icon: AlertTriangle, label: 'DESACTIVAR (Soft)' };
      case 'ANULAR':
        return { color: 'bg-orange-500/10 text-orange-400 border-orange-500/30', icon: AlertTriangle, label: 'ANULAR' };
      case 'ELIMINAR':
        return { color: 'bg-rose-500/10 text-rose-400 border-rose-500/30', icon: Trash2, label: 'ELIMINAR (Hard)' };
      default:
        return { color: 'bg-gray-500/10 text-gray-400 border-gray-500/30', icon: CheckCircle2, label: accion };
    }
  };

  const getModuloBadgeColor = (modulo: string) => {
    switch (modulo.toLowerCase()) {
      case 'contabilidad': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'facturas':
      case 'facturacion':  return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      case 'clientes':     return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'productos':    return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'inventario':   return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      case 'cotizaciones': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30';
      case 'usuarios':     return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      default:             return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex space-x-2">
          {[0, 0.1, 0.2].map((d, i) => (
            <div key={i} className="w-3.5 h-3.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${d}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-rose-500 to-indigo-600 text-white shadow-lg shadow-rose-500/25">
              <ShieldAlert className="w-7 h-7" />
            </span>
            Centro de Auditoría y Trazabilidad
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Supervisión integral de acciones, borrados lógicos, modificaciones y seguridad del sistema
          </p>
        </div>

        <button
          onClick={() => cargarDatos()}
          className="p-2.5 glass rounded-xl text-gray-400 hover:text-white transition flex items-center gap-2 text-sm font-semibold self-start sm:self-auto"
          title="Recargar registros"
        >
          <RefreshCw className="w-4 h-4" /> Recargar
        </button>
      </div>

      {/* Tarjetas KPI de Auditoría */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass p-5 rounded-2xl border-l-4 border-l-indigo-500 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Acciones Registradas Hoy</span>
            <h3 className="text-2xl font-extrabold text-indigo-400 font-mono mt-1">
              {stats?.accionesHoy || 0}
            </h3>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border-l-4 border-l-rose-500 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Bajas y Anulaciones (Soft/Hard)</span>
            <h3 className="text-2xl font-extrabold text-rose-400 font-mono mt-1">
              {stats?.totalBajasOAnulaciones || 0}
            </h3>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        <div className="glass p-5 rounded-2xl border-l-4 border-l-emerald-500 flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400 uppercase font-semibold">Total Eventos Históricos</span>
            <h3 className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
              {total}
            </h3>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="glass p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por usuario, módulo o detalle..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full bg-gray-900/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
          />
        </div>
        <div>
          <select
            value={filtroModulo}
            onChange={e => setFiltroModulo(e.target.value)}
            className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
          >
            <option value="todos">Todos los Módulos</option>
            <option value="clientes">Clientes</option>
            <option value="facturacion">Facturación</option>
            <option value="contabilidad">Contabilidad</option>
            <option value="productos">Productos</option>
            <option value="inventario">Inventario</option>
            <option value="cotizaciones">Cotizaciones</option>
            <option value="usuarios">Usuarios</option>
          </select>
        </div>
        <div>
          <select
            value={filtroAccion}
            onChange={e => setFiltroAccion(e.target.value)}
            className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
          >
            <option value="todos">Todas las Acciones</option>
            <option value="CREAR">CREAR</option>
            <option value="EDITAR">EDITAR</option>
            <option value="DESACTIVAR">DESACTIVAR (Soft Delete)</option>
            <option value="ANULAR">ANULAR</option>
            <option value="ELIMINAR">ELIMINAR (Hard Delete)</option>
          </select>
        </div>
        <div>
          <input
            type="date"
            value={filtroFechaInicio}
            onChange={e => setFiltroFechaInicio(e.target.value)}
            className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
            placeholder="Fecha Desde"
          />
        </div>
        <div>
          <input
            type="date"
            value={filtroFechaFin}
            onChange={e => setFiltroFechaFin(e.target.value)}
            className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
            placeholder="Fecha Hasta"
          />
        </div>
      </div>

      {/* Tabla de Logs de Auditoría */}
      <div className="glass rounded-2xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-900/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/5">
              <tr>
                <th className="p-4">Fecha y Hora</th>
                <th className="p-4">Usuario Responsable</th>
                <th className="p-4">Módulo</th>
                <th className="p-4">Acción</th>
                <th className="p-4">Descripción del Evento</th>
                <th className="p-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No se encontraron registros de auditoría con los filtros actuales.
                  </td>
                </tr>
              ) : (
                logs.map(log => {
                  const badgeAccion = getAccionBadge(log.accion);
                  const Icon = badgeAccion.icon;
                  return (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-mono text-gray-400 whitespace-nowrap">{log.fecha}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-gray-500" />
                          <span className="font-bold text-white">{log.usuario_nombre}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-white/5 uppercase">
                            {log.usuario_rol}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${getModuloBadgeColor(log.modulo)}`}>
                          {log.modulo}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badgeAccion.color}`}>
                          <Icon className="w-3 h-3" />
                          {badgeAccion.label}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-gray-200 max-w-md truncate">
                        {log.descripcion}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setLogSeleccionado(log)}
                          className="p-1.5 glass rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition"
                          title="Ver detalle del cambio"
                        >
                          <Eye className="w-4 h-4 text-indigo-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Visor de Detalles de Auditoría */}
      <AnimatePresence>
        {logSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="relative w-full max-w-2xl glass-float p-6 rounded-2xl flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">Detalle de Auditoría #{logSeleccionado.id}</h4>
                    <p className="text-xs text-gray-400">{logSeleccionado.fecha}</p>
                  </div>
                </div>
                <button
                  onClick={() => setLogSeleccionado(null)}
                  className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-4 overflow-y-auto flex-1 text-xs">
                <div className="grid grid-cols-2 gap-3 p-3 bg-gray-900/60 rounded-xl border border-white/5">
                  <div>
                    <span className="text-gray-400 block">Usuario:</span>
                    <span className="font-bold text-white">{logSeleccionado.usuario_nombre} ({logSeleccionado.usuario_rol})</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Módulo:</span>
                    <span className="font-bold text-indigo-400 uppercase">{logSeleccionado.modulo}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Acción:</span>
                    <span className="font-bold text-white uppercase">{logSeleccionado.accion}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Dirección IP:</span>
                    <span className="font-mono text-gray-300">{logSeleccionado.ip || 'No registrada'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-gray-400 block mb-1 font-semibold">Descripción del Evento:</span>
                  <div className="p-3 bg-gray-900/60 rounded-xl border border-white/5 text-gray-200">
                    {logSeleccionado.descripcion}
                  </div>
                </div>

                <div>
                  <span className="text-gray-400 block mb-1 font-semibold">Datos y Carga de Cambio (Payload JSON):</span>
                  <pre className="p-3 bg-gray-950 rounded-xl border border-white/10 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-60">
                    {JSON.stringify(logSeleccionado.detalles, null, 2) || 'Sin payload adicional'}
                  </pre>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end">
                <button
                  onClick={() => setLogSeleccionado(null)}
                  className="px-5 py-2 glass rounded-xl text-white hover:bg-white/10 text-xs font-semibold transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
