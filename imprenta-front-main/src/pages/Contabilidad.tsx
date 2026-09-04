import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpenCheck, Plus, Search, Filter, Calendar, Download,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronRight,
  TrendingUp, TrendingDown, DollarSign, Users, Scale, FileText,
  ShieldCheck, RefreshCw, Printer
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useConfirm } from '../components/ConfirmModal';
import AsientoFormModal from '../components/AsientoFormModal';
import type {
  CuentaContable,
  AsientoContable,
  BalanceGeneral,
  EstadoResultados,
  MovimientoClienteContable,
  Cliente,
} from '../types';

const toastStyle = {
  background: '#1F2937',
  color: 'white',
  borderRadius: '0.75rem',
  border: '1px solid rgba(255,255,255,0.1)',
};

export default function Contabilidad() {
  const { user } = useAuth();
  const { confirmar } = useConfirm();

  const [tab, setTab] = useState<'diario' | 'plan' | 'balance' | 'pyg' | 'clientes'>('diario');
  const [loading, setLoading] = useState(true);

  // Estados de datos
  const [cuentas, setCuentas] = useState<CuentaContable[]>([]);
  const [asientos, setAsientos] = useState<AsientoContable[]>([]);
  const [balance, setBalance] = useState<BalanceGeneral | null>(null);
  const [pyg, setPyg] = useState<EstadoResultados | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<string>('');
  const [movimientosCliente, setMovimientosCliente] = useState<MovimientoClienteContable[]>([]);

  // Filtros Libro Diario
  const [filtroFechaInicio, setFiltroFechaInicio] = useState('');
  const [filtroFechaFin, setFiltroFechaFin] = useState('');
  const [filtroTipoFuente, setFiltroTipoFuente] = useState('todos');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [busqueda, setBusqueda] = useState('');

  // Modales
  const [modalAsientoOpen, setModalAsientoOpen] = useState(false);
  const [asientoExpandido, setAsientoExpandido] = useState<number | null>(null);
  const [busquedaCuenta, setBusquedaCuenta] = useState('');
  const [descargandoPDF, setDescargandoPDF] = useState(false);

  // Carga de Datos
  const fetchCuentas = useCallback(async () => {
    try {
      const data = await apiClient.get<CuentaContable[]>('/api/contabilidad/cuentas');
      setCuentas(data || []);
    } catch {
      toast.error('Error al cargar plan de cuentas', { style: toastStyle });
    }
  }, []);

  const fetchAsientos = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtroFechaInicio) params.append('fechaInicio', filtroFechaInicio);
      if (filtroFechaFin) params.append('fechaFin', filtroFechaFin);
      if (filtroTipoFuente !== 'todos') params.append('tipoFuente', filtroTipoFuente);
      if (filtroEstado !== 'todos') params.append('estado', filtroEstado);
      if (busqueda.trim()) params.append('busqueda', busqueda.trim());

      const data = await apiClient.get<AsientoContable[]>(`/api/contabilidad/asientos?${params.toString()}`);
      setAsientos(data || []);
    } catch {
      toast.error('Error al cargar libro diario', { style: toastStyle });
    }
  }, [filtroFechaInicio, filtroFechaFin, filtroTipoFuente, filtroEstado, busqueda]);

  const fetchBalance = useCallback(async () => {
    try {
      const data = await apiClient.get<BalanceGeneral>('/api/contabilidad/balance-general');
      setBalance(data);
    } catch {
      toast.error('Error al calcular balance general', { style: toastStyle });
    }
  }, []);

  const fetchEstadoResultados = useCallback(async () => {
    try {
      const data = await apiClient.get<EstadoResultados>('/api/contabilidad/estado-resultados');
      setPyg(data);
    } catch {
      toast.error('Error al calcular estado de resultados', { style: toastStyle });
    }
  }, []);

  const fetchClientes = useCallback(async () => {
    try {
      const data = await apiClient.get<Cliente[]>('/api/clientes');
      setClientes(data || []);
    } catch {
      /* */
    }
  }, []);

  const fetchEstadoCuentaCliente = useCallback(async (clienteId: string) => {
    if (!clienteId) {
      setMovimientosCliente([]);
      return;
    }
    try {
      const data = await apiClient.get<MovimientoClienteContable[]>(`/api/contabilidad/estado-cuenta-cliente/${clienteId}`);
      setMovimientosCliente(data || []);
    } catch {
      toast.error('Error al obtener estado de cuenta del cliente', { style: toastStyle });
    }
  }, []);

  const cargarDatos = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchCuentas(),
      fetchAsientos(),
      fetchBalance(),
      fetchEstadoResultados(),
      fetchClientes(),
    ]);
    setLoading(false);
  }, [fetchCuentas, fetchAsientos, fetchBalance, fetchEstadoResultados, fetchClientes]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (tab === 'diario') fetchAsientos();
    if (tab === 'balance') fetchBalance();
    if (tab === 'pyg') fetchEstadoResultados();
  }, [tab, fetchAsientos, fetchBalance, fetchEstadoResultados]);

  // Anular Asiento
  const handleAnularAsiento = async (asiento: AsientoContable) => {
    const ok = await confirmar({
      title: '¿Anular Asiento Contable?',
      message: `¿Estás seguro de anular el asiento ${asiento.numero_asiento}? Esta acción quedará registrada en auditoría.`,
      confirmText: 'Sí, anular',
      danger: true,
    });
    if (!ok) return;

    try {
      await apiClient.patch(`/api/contabilidad/asientos/${asiento.id}/anular`, {
        motivo: 'Anulado desde módulo contable',
      });
      toast.success('Asiento anulado correctamente', { style: toastStyle });
      fetchAsientos();
      fetchBalance();
      fetchEstadoResultados();
    } catch (err: any) {
      toast.error(err.message || 'Error al anular asiento', { style: toastStyle });
    }
  };

  // Descargar PDF Reportes
  const handleDescargarPDF = async (tipoReporte: 'balance' | 'pyg') => {
    setDescargandoPDF(true);
    try {
      const endpoint = tipoReporte === 'balance'
        ? '/api/contabilidad/balance-general/pdf'
        : '/api/contabilidad/estado-resultados/pdf';
      const blob = await apiClient.blob(endpoint);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = tipoReporte === 'balance' ? 'Balance_General_Imprenta.pdf' : 'Estado_Resultados_Imprenta.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte PDF generado exitosamente', { style: toastStyle });
    } catch {
      toast.error('Error al descargar reporte PDF', { style: toastStyle });
    } finally {
      setDescargandoPDF(false);
    }
  };

  // Filtro de cuentas
  const cuentasFiltradas = cuentas.filter(c =>
    c.codigo.toLowerCase().includes(busquedaCuenta.toLowerCase()) ||
    c.nombre.toLowerCase().includes(busquedaCuenta.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Encabezado Principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25">
              <BookOpenCheck className="w-7 h-7" />
            </span>
            Módulo Contable
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Partida doble, Libro Diario, Plan de Cuentas, Balance General y Cartera de Clientes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => cargarDatos()}
            className="p-2.5 glass rounded-xl text-gray-400 hover:text-white transition"
            title="Recargar datos contables"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setModalAsientoOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 flex items-center gap-2 text-sm transition"
          >
            <Plus className="w-4 h-4" /> Nuevo Asiento
          </button>
        </div>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex flex-wrap gap-2 p-1.5 glass rounded-2xl border border-white/5">
        {[
          { id: 'diario',   label: 'Libro Diario',       icon: BookOpenCheck },
          { id: 'plan',     label: 'Plan de Cuentas',     icon: FileText },
          { id: 'balance',  label: 'Balance General',     icon: Scale },
          { id: 'pyg',      label: 'Estado de Resultados',icon: TrendingUp },
          { id: 'clientes', label: 'Cartera Clientes',    icon: Users },
        ].map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 ${
                active
                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── 1. PESTAÑA: LIBRO DIARIO ────────────────────────────────────────── */}
      {tab === 'diario' && (
        <div className="space-y-4">
          {/* Barra de Filtros */}
          <div className="glass p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar asiento o glosa..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                className="w-full bg-gray-900/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
              />
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
            <div>
              <select
                value={filtroTipoFuente}
                onChange={e => setFiltroTipoFuente(e.target.value)}
                className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
              >
                <option value="todos">Todos los Orígenes</option>
                <option value="manual">Manual</option>
                <option value="factura">Facturación</option>
                <option value="cobro_cliente">Cobro Cliente</option>
                <option value="compra">Compra</option>
              </select>
            </div>
            <div>
              <select
                value={filtroEstado}
                onChange={e => setFiltroEstado(e.target.value)}
                className="w-full bg-gray-900/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
              >
                <option value="todos">Todos los Estados</option>
                <option value="contabilizado">Contabilizados</option>
                <option value="anulado">Anulados</option>
              </select>
            </div>
          </div>

          {/* Tabla de Asientos */}
          <div className="glass rounded-2xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-900/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/5">
                  <tr>
                    <th className="p-4 w-10"></th>
                    <th className="p-4">Nº Asiento</th>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Origen</th>
                    <th className="p-4">Glosa / Concepto</th>
                    <th className="p-4 text-right">Total Débito</th>
                    <th className="p-4 text-right">Total Crédito</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {asientos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-gray-500">
                        No se encontraron asientos contables registrados.
                      </td>
                    </tr>
                  ) : (
                    asientos.map(a => {
                      const expandido = asientoExpandido === a.id;
                      return (
                        <React.Fragment key={a.id}>
                          <tr className="hover:bg-white/5 transition-colors">
                            <td className="p-4">
                              <button
                                onClick={() => setAsientoExpandido(expandido ? null : a.id)}
                                className="p-1 hover:bg-white/10 rounded transition text-gray-400 hover:text-white"
                              >
                                {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            </td>
                            <td className="p-4 font-mono font-bold text-indigo-400">{a.numero_asiento}</td>
                            <td className="p-4">{a.fecha}</td>
                            <td className="p-4 capitalize">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-800 text-gray-300 border border-white/10">
                                {a.tipo_fuente}
                              </span>
                            </td>
                            <td className="p-4 font-medium text-white max-w-xs truncate">{a.concepto}</td>
                            <td className="p-4 text-right font-mono font-bold text-emerald-400">
                              ${Number(a.total_debito).toFixed(2)}
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-indigo-400">
                              ${Number(a.total_credito).toFixed(2)}
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                a.estado === 'contabilizado'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}>
                                {a.estado.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {a.estado === 'contabilizado' && (
                                <button
                                  onClick={() => handleAnularAsiento(a)}
                                  className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-[10px] font-bold transition"
                                >
                                  Anular
                                </button>
                              )}
                            </td>
                          </tr>

                          {/* Vista Desplegable de Líneas */}
                          {expandido && (
                            <tr>
                              <td colSpan={9} className="p-4 bg-gray-950/60 border-y border-indigo-500/20">
                                <div className="space-y-2 p-2">
                                  <h6 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                                    Detalle de Partida Doble — Asiento {a.numero_asiento}
                                  </h6>
                                  <table className="w-full text-[11px] text-left">
                                    <thead className="text-gray-400 border-b border-white/10">
                                      <tr>
                                        <th className="py-1">Código Cuenta</th>
                                        <th className="py-1">Nombre de Cuenta</th>
                                        <th className="py-1">Detalle</th>
                                        <th className="py-1 text-right">Débito ($)</th>
                                        <th className="py-1 text-right">Crédito ($)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5 font-mono">
                                      {a.lineas.map(l => (
                                        <tr key={l.id}>
                                          <td className="py-1.5 text-indigo-400 font-bold">{l.cuenta_codigo}</td>
                                          <td className="py-1.5 text-white">{l.cuenta_nombre}</td>
                                          <td className="py-1.5 text-gray-400 font-sans">{l.descripcion || '—'}</td>
                                          <td className="py-1.5 text-right text-emerald-400">
                                            {Number(l.debito) > 0 ? `$${Number(l.debito).toFixed(2)}` : '—'}
                                          </td>
                                          <td className="py-1.5 text-right text-indigo-400">
                                            {Number(l.credito) > 0 ? `$${Number(l.credito).toFixed(2)}` : '—'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. PESTAÑA: PLAN DE CUENTAS ────────────────────────────────────── */}
      {tab === 'plan' && (
        <div className="space-y-4">
          <div className="glass p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por código o nombre de cuenta..."
                value={busquedaCuenta}
                onChange={e => setBusquedaCuenta(e.target.value)}
                className="w-full bg-gray-900/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-indigo-500 outline-none"
              />
            </div>
            <span className="text-xs text-gray-400 font-medium">
              Total Cuentas: <b className="text-white">{cuentas.length}</b>
            </span>
          </div>

          <div className="glass rounded-2xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-900/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/5">
                  <tr>
                    <th className="p-4">Código</th>
                    <th className="p-4">Nombre de Cuenta</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4">Naturaleza</th>
                    <th className="p-4 text-center">Nivel</th>
                    <th className="p-4 text-center">Tipo de Cuenta</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {cuentasFiltradas.map(c => {
                    const esPadre = !c.permite_movimiento;
                    const colorTipo = {
                      activo:     'text-blue-400 bg-blue-500/10 border-blue-500/30',
                      pasivo:     'text-red-400 bg-red-500/10 border-red-500/30',
                      patrimonio: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
                      ingreso:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
                      costo:      'text-amber-400 bg-amber-500/10 border-amber-500/30',
                      gasto:      'text-rose-400 bg-rose-500/10 border-rose-500/30',
                    }[c.tipo] || 'text-gray-400 bg-gray-500/10 border-gray-500/30';

                    return (
                      <tr key={c.id} className={`hover:bg-white/5 transition-colors ${esPadre ? 'bg-gray-900/30 font-bold' : ''}`}>
                        <td className="p-4 font-mono text-indigo-400">{c.codigo}</td>
                        <td className="p-4" style={{ paddingLeft: `${(c.nivel - 1) * 20 + 16}px` }}>
                          <span className={esPadre ? 'text-white' : 'text-gray-300'}>
                            {c.nombre}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorTipo} uppercase`}>
                            {c.tipo}
                          </span>
                        </td>
                        <td className="p-4 capitalize">{c.naturaleza}</td>
                        <td className="p-4 text-center font-mono">{c.nivel}</td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.permite_movimiento
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : 'bg-gray-800 text-gray-400 border border-white/10'
                          }`}>
                            {c.permite_movimiento ? 'Movimiento' : 'Agrupación'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. PESTAÑA: BALANCE GENERAL ────────────────────────────────────── */}
      {tab === 'balance' && (
        <div className="space-y-6">
          {/* Tarjetas KPI de Balance */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass p-5 rounded-2xl border-l-4 border-l-blue-500">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Activos</span>
              <h3 className="text-2xl font-extrabold text-blue-400 font-mono mt-1">
                ${(balance?.totalActivos || 0).toFixed(2)}
              </h3>
            </div>
            <div className="glass p-5 rounded-2xl border-l-4 border-l-red-500">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Pasivos</span>
              <h3 className="text-2xl font-extrabold text-red-400 font-mono mt-1">
                ${(balance?.totalPasivos || 0).toFixed(2)}
              </h3>
            </div>
            <div className="glass p-5 rounded-2xl border-l-4 border-l-purple-500">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Patrimonio</span>
              <h3 className="text-2xl font-extrabold text-purple-400 font-mono mt-1">
                ${(balance?.totalPatrimonio || 0).toFixed(2)}
              </h3>
            </div>
          </div>

          {/* Botón de Descarga PDF */}
          <div className="flex justify-end">
            <button
              onClick={() => handleDescargarPDF('balance')}
              disabled={descargandoPDF}
              className="px-5 py-2.5 glass rounded-xl text-white hover:bg-white/10 flex items-center gap-2 text-sm font-semibold transition"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              {descargandoPDF ? 'Generando PDF...' : 'Imprimir / Descargar Balance en PDF'}
            </button>
          </div>

          {/* Desglose de Cuentas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Activos */}
            <div className="glass p-5 rounded-2xl space-y-3">
              <h4 className="text-base font-bold text-blue-400 border-b border-white/10 pb-2">1. ACTIVOS</h4>
              <div className="space-y-1.5 text-xs font-mono max-h-96 overflow-y-auto pr-2">
                {balance?.cuentas.activos.map(c => (
                  <div key={c.id} className="flex justify-between py-1 border-b border-white/5">
                    <span className={c.permite_movimiento ? 'text-gray-300 font-sans' : 'text-white font-bold font-sans'}>
                      {c.codigo} {c.nombre}
                    </span>
                    <span className="text-blue-400 font-bold">${Number(c.saldo).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pasivos y Patrimonio */}
            <div className="glass p-5 rounded-2xl space-y-6">
              <div>
                <h4 className="text-base font-bold text-red-400 border-b border-white/10 pb-2">2. PASIVOS</h4>
                <div className="space-y-1.5 text-xs font-mono max-h-48 overflow-y-auto pr-2 mt-2">
                  {balance?.cuentas.pasivos.map(c => (
                    <div key={c.id} className="flex justify-between py-1 border-b border-white/5">
                      <span className={c.permite_movimiento ? 'text-gray-300 font-sans' : 'text-white font-bold font-sans'}>
                        {c.codigo} {c.nombre}
                      </span>
                      <span className="text-red-400 font-bold">${Number(c.saldo).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-base font-bold text-purple-400 border-b border-white/10 pb-2">3. PATRIMONIO</h4>
                <div className="space-y-1.5 text-xs font-mono max-h-48 overflow-y-auto pr-2 mt-2">
                  {balance?.cuentas.patrimonio.map(c => (
                    <div key={c.id} className="flex justify-between py-1 border-b border-white/5">
                      <span className={c.permite_movimiento ? 'text-gray-300 font-sans' : 'text-white font-bold font-sans'}>
                        {c.codigo} {c.nombre}
                      </span>
                      <span className="text-purple-400 font-bold">${Number(c.saldo).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. PESTAÑA: ESTADO DE RESULTADOS (PyG) ──────────────────────────── */}
      {tab === 'pyg' && (
        <div className="space-y-6">
          {/* Tarjetas KPI de PyG */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass p-5 rounded-2xl border-l-4 border-l-emerald-500">
              <span className="text-xs text-gray-400 uppercase font-semibold">Total Ingresos</span>
              <h3 className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                ${(pyg?.totalIngresos || 0).toFixed(2)}
              </h3>
            </div>
            <div className="glass p-5 rounded-2xl border-l-4 border-l-amber-500">
              <span className="text-xs text-gray-400 uppercase font-semibold">Costos Producción</span>
              <h3 className="text-2xl font-extrabold text-amber-400 font-mono mt-1">
                ${(pyg?.totalCostos || 0).toFixed(2)}
              </h3>
            </div>
            <div className="glass p-5 rounded-2xl border-l-4 border-l-rose-500">
              <span className="text-xs text-gray-400 uppercase font-semibold">Gastos Operativos</span>
              <h3 className="text-2xl font-extrabold text-rose-400 font-mono mt-1">
                ${(pyg?.totalGastos || 0).toFixed(2)}
              </h3>
            </div>
            <div className={`glass p-5 rounded-2xl border-l-4 ${
              (pyg?.utilidadNeta || 0) >= 0 ? 'border-l-indigo-500' : 'border-l-rose-600'
            }`}>
              <span className="text-xs text-gray-400 uppercase font-semibold">Utilidad Neta</span>
              <h3 className={`text-2xl font-extrabold font-mono mt-1 ${
                (pyg?.utilidadNeta || 0) >= 0 ? 'text-indigo-400' : 'text-rose-500'
              }`}>
                ${(pyg?.utilidadNeta || 0).toFixed(2)}
              </h3>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleDescargarPDF('pyg')}
              disabled={descargandoPDF}
              className="px-5 py-2.5 glass rounded-xl text-white hover:bg-white/10 flex items-center gap-2 text-sm font-semibold transition"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              {descargandoPDF ? 'Generando PDF...' : 'Imprimir / Descargar Estado de Resultados'}
            </button>
          </div>

          {/* Desglose */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass p-5 rounded-2xl space-y-3">
              <h4 className="text-base font-bold text-emerald-400 border-b border-white/10 pb-2">4. INGRESOS</h4>
              <div className="space-y-1.5 text-xs font-mono max-h-80 overflow-y-auto pr-2">
                {pyg?.cuentas.ingresos.map(c => (
                  <div key={c.id} className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-300 font-sans">{c.codigo} {c.nombre}</span>
                    <span className="text-emerald-400 font-bold">${Number(c.saldo).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass p-5 rounded-2xl space-y-3">
              <h4 className="text-base font-bold text-amber-400 border-b border-white/10 pb-2">5. COSTOS</h4>
              <div className="space-y-1.5 text-xs font-mono max-h-80 overflow-y-auto pr-2">
                {pyg?.cuentas.costos.map(c => (
                  <div key={c.id} className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-300 font-sans">{c.codigo} {c.nombre}</span>
                    <span className="text-amber-400 font-bold">${Number(c.saldo).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass p-5 rounded-2xl space-y-3">
              <h4 className="text-base font-bold text-rose-400 border-b border-white/10 pb-2">6. GASTOS</h4>
              <div className="space-y-1.5 text-xs font-mono max-h-80 overflow-y-auto pr-2">
                {pyg?.cuentas.gastos.map(c => (
                  <div key={c.id} className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-300 font-sans">{c.codigo} {c.nombre}</span>
                    <span className="text-rose-400 font-bold">${Number(c.saldo).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. PESTAÑA: CARTERA DE CLIENTES (DÉBITO Y CRÉDITO) ─────────────── */}
      {tab === 'clientes' && (
        <div className="space-y-6">
          <div className="glass p-5 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
            <div className="w-full sm:w-80">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Seleccionar Cliente
              </label>
              <select
                value={clienteSeleccionado}
                onChange={e => {
                  setClienteSeleccionado(e.target.value);
                  fetchEstadoCuentaCliente(e.target.value);
                }}
                className="w-full bg-gray-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-indigo-500 outline-none"
              >
                <option value="">Selecciona un cliente para ver su estado de cuenta...</option>
                {clientes.map(cl => (
                  <option key={cl.id} value={cl.id}>
                    {cl.nombre} {cl.telefono ? `(${cl.telefono})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {clienteSeleccionado && movimientosCliente.length > 0 && (
              <div className="flex-1 flex gap-4 justify-end font-mono">
                <div className="glass px-4 py-2 rounded-xl text-right">
                  <span className="text-[10px] text-gray-400 uppercase block">Total Facturado</span>
                  <span className="text-sm font-bold text-white">
                    ${movimientosCliente.reduce((sum, m) => sum + Number(m.valor_factura), 0).toFixed(2)}
                  </span>
                </div>
                <div className="glass px-4 py-2 rounded-xl text-right">
                  <span className="text-[10px] text-gray-400 uppercase block">Total Pagado</span>
                  <span className="text-sm font-bold text-emerald-400">
                    ${movimientosCliente.reduce((sum, m) => sum + Number(m.pagado), 0).toFixed(2)}
                  </span>
                </div>
                <div className="glass px-4 py-2 rounded-xl text-right border-l-2 border-l-rose-500">
                  <span className="text-[10px] text-gray-400 uppercase block">Saldo Pendiente</span>
                  <span className="text-sm font-bold text-rose-400">
                    ${movimientosCliente.reduce((sum, m) => sum + Number(m.saldo_pendiente), 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Tabla de Movimientos del Cliente */}
          <div className="glass rounded-2xl overflow-hidden border border-white/5">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-900/60 text-gray-400 uppercase tracking-wider font-semibold border-b border-white/5">
                  <tr>
                    <th className="p-4">Nº Factura</th>
                    <th className="p-4">Fecha</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Débito (Facturado)</th>
                    <th className="p-4 text-right">Crédito (Abonado)</th>
                    <th className="p-4 text-right">Saldo Exigible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {movimientosCliente.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 font-sans">
                        {clienteSeleccionado
                          ? 'Este cliente no tiene facturas registradas.'
                          : 'Selecciona un cliente arriba para ver su historial de pagos y facturas.'}
                      </td>
                    </tr>
                  ) : (
                    movimientosCliente.map(m => (
                      <tr key={m.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-indigo-400 font-sans">{m.numero}</td>
                        <td className="p-4 font-sans">{m.fecha}</td>
                        <td className="p-4 font-sans">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            m.estado === 'pagada'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}>
                            {m.estado.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-right text-white">${Number(m.valor_factura).toFixed(2)}</td>
                        <td className="p-4 text-right text-emerald-400">${Number(m.pagado).toFixed(2)}</td>
                        <td className="p-4 text-right text-rose-400 font-bold">
                          ${Number(m.saldo_pendiente).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Asiento */}
      <AnimatePresence>
        {modalAsientoOpen && (
          <AsientoFormModal
            cuentas={cuentas}
            onClose={() => setModalAsientoOpen(false)}
            onSuccess={() => {
              fetchAsientos();
              fetchBalance();
              fetchEstadoResultados();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
