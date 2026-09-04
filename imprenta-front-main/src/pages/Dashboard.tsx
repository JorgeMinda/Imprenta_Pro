// src/pages/Dashboard.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../api/client';
import type { ProductoAlert } from '../types';
import { Link } from 'react-router-dom';
import {
  Package, Clock, CheckCircle, DollarSign, ArrowRight, AlertTriangle,
  Plus, Users, ShoppingBag, Paintbrush, TrendingUp, Truck,
  FileText, RefreshCw
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import toast from 'react-hot-toast';

interface Stats {
  diseno:         number;
  en_proceso:     number;
  terminadas:     number;
  entregadas:     number;
  ganancias:      number;
  total_clientes: number;
  ventas_mensuales: { mes: string; ventas: number; cotizaciones: number }[];
}

const toastStyle = {
  background: '#1F2937', color: 'white',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem',
};

const tooltipStyle = {
  backgroundColor: 'rgba(17,24,39,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.75rem', color: '#fff',
};

export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState<Stats>({
    diseno: 0, en_proceso: 0, terminadas: 0, entregadas: 0,
    ganancias: 0, total_clientes: 0, ventas_mensuales: [],
  });
  const [alertasStock, setAlertasStock] = useState<ProductoAlert[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const fetchData = async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsData, productos] = await Promise.all([
        apiClient.get<{ diseno?: number; pendientes?: number; en_proceso?: number; terminadas?: number; entregadas?: number; ganancias?: number; total_clientes?: number; ventas_mensuales?: Stats['ventas_mensuales'] }>('/api/stats/dashboard'),
        apiClient.get<ProductoAlert[]>('/api/productos').catch(() => []),
      ]);

      if (statsData) {
        setStats({
          diseno:          statsData.diseno          ?? statsData.pendientes ?? 0,
          en_proceso:      statsData.en_proceso      ?? 0,
          terminadas:      statsData.terminadas      ?? 0,
          entregadas:      statsData.entregadas      ?? 0,
          ganancias:       statsData.ganancias       ?? 0,
          total_clientes:  statsData.total_clientes  ?? 0,
          ventas_mensuales: Array.isArray(statsData.ventas_mensuales) ? statsData.ventas_mensuales : [],
        });
      }

      const prods = Array.isArray(productos) ? productos : [];
      setAlertasStock(prods.filter((p: ProductoAlert) => p && p.stock !== undefined && Number(p.stock) <= 5));

      if (!manual && user?.nombre && !sessionStorage.getItem('welcomeToastShown')) {
        toast(`¡Bienvenido de nuevo, ${user.nombre}!`, { icon: '👋', style: toastStyle, duration: 3000 });
        sessionStorage.setItem('welcomeToastShown', 'true');
      }
      if (manual) toast.success('Dashboard actualizado', { style: toastStyle });
    } catch {
      toast.error('Error al sincronizar datos', { style: toastStyle });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ── KPIs principales (fila 1) ─────────────────────────────────────────────
  const kpisPrincipales = [
    { id: 'diseno',    title: 'EN DISEÑO',   value: stats.diseno,         icon: Paintbrush,   color: '#8B5CF6' },
    { id: 'proceso',   title: 'EN PROCESO',  value: stats.en_proceso,     icon: Clock,        color: '#F59E0B' },
    { id: 'terminada', title: 'TERMINADAS',  value: stats.terminadas,     icon: CheckCircle,  color: '#10B981' },
    { id: 'entregada', title: 'ENTREGADAS',  value: stats.entregadas,     icon: Truck,        color: '#3B82F6' },
  ];

  // ── KPIs secundarios (fila 2) ─────────────────────────────────────────────
  const kpisSecundarios = [
    {
      id: 'ganancias',
      title: 'INGRESOS TOTALES',
      value: `$${Number(stats.ganancias).toLocaleString('es-EC', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: '#10B981',
      desc: 'De órdenes entregadas',
    },
    {
      id: 'clientes',
      title: 'CLIENTES',
      value: stats.total_clientes,
      icon: Users,
      color: '#6366F1',
      desc: 'Registrados en el sistema',
    },
    {
      id: 'activas',
      title: 'ÓRDENES ACTIVAS',
      value: stats.diseno + stats.en_proceso,
      icon: TrendingUp,
      color: '#F59E0B',
      desc: 'Diseño + en proceso',
    },
    {
      id: 'completadas',
      title: 'COMPLETADAS',
      value: stats.terminadas + stats.entregadas,
      icon: FileText,
      color: '#EC4899',
      desc: 'Terminadas + entregadas',
    },
  ];

  const quickActions = [
    { id: 'qa-cotiz', title: 'Nueva Cotización', to: '/cotizaciones', icon: Plus,        gradient: 'from-indigo-600 to-blue-700',   desc: 'Crea presupuestos rápidamente' },
    { id: 'qa-ord',   title: 'Ver Órdenes',      to: '/ordenes',      icon: Package,     gradient: 'from-emerald-600 to-teal-700',  desc: 'Controla producción y entregas' },
    { id: 'qa-clie',  title: 'Clientes',          to: '/clientes',     icon: Users,       gradient: 'from-blue-600 to-cyan-700',    desc: 'Gestiona tus contactos' },
    { id: 'qa-prod',  title: 'Productos',         to: '/productos',    icon: ShoppingBag, gradient: 'from-purple-600 to-violet-700', desc: 'Catálogo actualizado' },
  ];

  if (loading) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="flex space-x-2">
        {[0, 0.1, 0.2].map((d, i) => (
          <div key={i} className="w-4 h-4 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: `${d}s` }} />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
            Bienvenido{user?.nombre ? `, ${user.nombre}` : ''} 👋
          </h2>
          <p className="text-sm text-gray-400 mt-1">Resumen general de tu imprenta</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => fetchData(true)} disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-white/10 rounded-xl text-gray-400 hover:text-white transition text-sm">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </motion.button>
      </motion.div>

      {/* KPIs fila 1 — estados de órdenes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisPrincipales.map((k, i) => (
          <motion.div key={k.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            whileHover={{ scale: 1.03, y: -4 }}
            className="relative glass p-6 shadow-2xl overflow-hidden group cursor-default"
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500"
              style={{ background: `radial-gradient(circle at center, ${k.color}, transparent 70%)` }} />
            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-gray-800/50 border border-white/5"
                style={{ boxShadow: `0 0 20px ${k.color}33` }}>
                <k.icon className="w-6 h-6" style={{ color: k.color }} />
              </div>
              <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wider">{k.title}</p>
              <p className="text-4xl font-black text-white">{k.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* KPIs fila 2 — métricas de negocio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpisSecundarios.map((k, i) => (
          <motion.div key={k.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + i * 0.07 }}
            className="glass p-5 flex items-center gap-4"
          >
            <div className="p-3 rounded-xl shrink-0"
              style={{ background: `${k.color}20`, border: `1px solid ${k.color}30` }}>
              <k.icon className="w-5 h-5" style={{ color: k.color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-black text-white">{k.value}</p>
              <p className="text-xs text-gray-400 font-medium">{k.title}</p>
              <p className="text-xs text-gray-600 truncate">{k.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Gráfica ventas mensuales */}
      {stats.ventas_mensuales.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Actividad Reciente</h3>
              <p className="text-xs text-gray-400">Ventas y cotizaciones últimos 6 meses</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.ventas_mensuales} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="mes" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar dataKey="ventas" name="Ventas ($)" fill="#6366F1" radius={[4,4,0,0]} barSize={18} />
                <Bar dataKey="cotizaciones" name="Cotizaciones" fill="#1e1b4b" radius={[4,4,0,0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* Alertas de Stock */}
      {alertasStock.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400 animate-pulse" />
            <h3 className="text-lg font-bold text-red-400">Stock Crítico</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {alertasStock.map((p, idx) => (
              <div key={`${p.id}-${idx}`}
                className="bg-gray-900/60 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                <p className="font-medium text-gray-200 truncate pr-2">{p.nombre}</p>
                <span className="text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30 px-2.5 py-0.5 rounded-full">
                  {p.stock} unids.
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {quickActions.map((action, i) => (
          <Link key={action.id} to={action.to}>
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              whileHover={{ scale: 1.02 }}
              className={`bg-gradient-to-br ${action.gradient} text-white rounded-2xl p-6 shadow-lg relative overflow-hidden group border border-white/10 h-full`}
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10 flex flex-col h-full">
                <div className="bg-white/20 p-3 rounded-xl mb-4 w-fit backdrop-blur-md border border-white/10">
                  <action.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-1 flex items-center gap-2 group-hover:gap-3 transition-all">
                  {action.title} <ArrowRight className="w-4 h-4 opacity-70" />
                </h3>
                <p className="text-white/70 text-sm mt-auto">{action.desc}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}