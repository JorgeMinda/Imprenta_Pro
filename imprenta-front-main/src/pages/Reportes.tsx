// src/pages/Reportes.tsx — datos reales del backend
import { useEffect, useState, useCallback } from 'react';
import { apiClient } from '../api/client';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import {
  AlertCircle, TrendingUp, PieChart as PieChartIcon,
  Activity, RefreshCw, Award
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ReportesData {
  ventas_mensuales:   { mes: string; ventas: number; cotizaciones: number }[];
  estados_ordenes:    { nombre: string; valor: number }[];
  top_productos:      { producto: string; cantidad: number; ingresos: number }[];
  ingresos_mensuales: { mes: string; ventas: number }[];
}

const COLORS = ['#8B5CF6','#10B981','#3B82F6','#F59E0B','#EF4444'];

const toastStyle = {
  background: '#1F2937', color: 'white',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem',
};

const tooltipStyle = {
  backgroundColor: 'rgba(17,24,39,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '0.75rem', color: '#fff',
};

function ChartCard({ title, icon, color, children, span = '' }: {
  title: string; icon: React.ReactNode; color: string;
  children: React.ReactNode; span?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl ${span}`}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg border" style={{ background: `${color}20`, borderColor: `${color}30` }}>
          <span style={{ color }}>{icon}</span>
        </div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      <div className="h-[280px] w-full">{children}</div>
    </motion.div>
  );
}

// Skeleton para gráficos
function ChartSkeleton({ span = '' }: { span?: string }) {
  return (
    <div className={`bg-gray-900/40 border border-white/10 rounded-2xl p-6 ${span}`}>
      <div className="h-6 w-48 bg-gray-700/60 rounded animate-pulse mb-6" />
      <div className="h-[280px] bg-gray-800/40 rounded-xl animate-pulse" />
    </div>
  );
}

export default function Reportes() {
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [data,     setData]     = useState<ReportesData | null>(null);

  const fetchReportes = useCallback(async (manual = false) => {
    let toastId: string | undefined;
    if (manual) toastId = toast.loading('Actualizando métricas…', { style: toastStyle });
    else setLoading(true);

    try {
      const json = await apiClient.get<ReportesData>('/api/stats/reportes');
      setData(json);
      setError(null);
      if (manual) toast.success('Reportes actualizados', { id: toastId, style: toastStyle });
    } catch (err: any) {
      const msg = err.message || 'Error al cargar reportes';
      if (manual) toast.error(msg, { id: toastId, style: toastStyle });
      else setError(msg);
    } finally {
      if (!manual) setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReportes(false); }, [fetchReportes]);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-10 w-64 bg-gray-700/50 rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartSkeleton /><ChartSkeleton /><ChartSkeleton span="lg:col-span-2" />
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center p-12 bg-gray-900/40 border border-white/10 rounded-3xl">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <p className="text-xl text-red-400 mb-6">{error}</p>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => fetchReportes(false)}
          className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-6 py-2.5 rounded-xl flex items-center gap-2 mx-auto"
        >
          <RefreshCw className="w-4 h-4" /> Reintentar
        </motion.button>
      </div>
    </div>
  );

  const d = data!;
  // Si no hay datos reales, mostrar datos de ejemplo
  const ventasMensuales = d.ventas_mensuales.length > 0 ? d.ventas_mensuales : [
    { mes: 'Ene', ventas: 0, cotizaciones: 0 },
  ];
  const ingresosMensuales = d.ingresos_mensuales.length > 0 ? d.ingresos_mensuales : ventasMensuales;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard de Reportes</h1>
          <p className="text-sm text-gray-400 mt-1">Métricas reales de tu negocio</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => fetchReportes(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700/80 border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Actualizar
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Ventas vs Cotizaciones */}
        <ChartCard title="Ventas vs Cotizaciones" icon={<TrendingUp className="w-5 h-5" />} color="#6366F1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ventasMensuales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="mes" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Bar dataKey="ventas" name="Ventas ($)" fill="#8B5CF6" radius={[4,4,0,0]} barSize={20} />
              <Bar dataKey="cotizaciones" name="Cotizaciones" fill="#4C1D95" radius={[4,4,0,0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Distribución de órdenes */}
        <ChartCard title="Estado de Órdenes" icon={<PieChartIcon className="w-5 h-5" />} color="#10B981">
          {d.estados_ordenes.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Sin órdenes registradas</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.estados_ordenes} cx="50%" cy="50%" innerRadius={60} outerRadius={100}
                  paddingAngle={5} dataKey="valor" nameKey="nombre">
                  {d.estados_ordenes.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0)" />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: '#fff' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Tendencia de ingresos */}
        <ChartCard title="Tendencia de Ingresos (entregadas)" icon={<Activity className="w-5 h-5" />} color="#EC4899" span="lg:col-span-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={ingresosMensuales} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="mes" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="ventas" name="Ingresos Netos ($)" stroke="#EC4899" strokeWidth={3}
                dot={{ r: 4, fill: '#EC4899', strokeWidth: 2, stroke: '#111827' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top productos */}
        {d.top_productos.length > 0 && (
          <ChartCard title="Top Productos" icon={<Award className="w-5 h-5" />} color="#F59E0B" span="lg:col-span-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.top_productos} layout="vertical" margin={{ top: 0, right: 30, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="producto" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} width={100} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="ingresos" name="Ingresos ($)" fill="#F59E0B" radius={[0,4,4,0]} barSize={18} />
                <Bar dataKey="cantidad" name="Unidades vendidas" fill="#78350F" radius={[0,4,4,0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

      </div>
    </div>
  );
}