// src/components/NotificacionesPanel.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../api/config';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Package, Clock, AlertTriangle, CheckCheck, X } from 'lucide-react';

interface AlertaStock {
  material_id: number;
  nombre:      string;
  unidad:      string;
  stock_actual: number;
  stock_minimo: number;
}


interface Notificacion {
  id:     string;
  tipo:   'stock' | 'orden';
  titulo: string;
  desc:   string;
  color:  string;
  icon:   'package' | 'clock';
}

const POLL_MS    = 60_000; // refresca cada 60 seg
const DIAS_ALERTA = 3;     // órdenes sin moverse en +3 días

export default function NotificacionesPanel() {
  const { token } = useAuth();
  const [open,  setOpen]  = useState(false);
  const [items, setItems] = useState<Notificacion[]>([]);
  const [leidas, setLeidas] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem('notif_leidas') || '[]')); }
    catch { return new Set(); }
  });
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Fetch alertas ─────────────────────────────────────────────────────────
  const fetchAlertas = useCallback(async () => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [stockRes, ordenesRes] = await Promise.all([
        fetch(`${API_BASE}/api/inventario/alertas`,  { headers }),
        fetch(`${API_BASE}/api/ordenes_trabajo`,      { headers }),
      ]);

      const nuevas: Notificacion[] = [];

      // Stock bajo
      if (stockRes.ok) {
        const alertas: AlertaStock[] = await stockRes.json();
        alertas.forEach(a => {
          nuevas.push({
            id:     `stock-${a.material_id}`,
            tipo:   'stock',
            titulo: `Stock bajo: ${a.nombre}`,
            desc:   `${a.stock_actual} ${a.unidad} (mín: ${a.stock_minimo})`,
            color:  'amber',
            icon:   'package',
          });
        });
      }

      // Órdenes detenidas
      if (ordenesRes.ok) {
        const ordenes: any[] = await ordenesRes.json();
        const ahora = Date.now();
        ordenes.forEach(o => {
          if (['entregada', 'terminada'].includes(o.estado?.toLowerCase())) return;
          const inicio = new Date(o.fecha_inicio).getTime();
          const dias   = Math.floor((ahora - inicio) / 86_400_000);
          if (dias >= DIAS_ALERTA) {
            nuevas.push({
              id:     `orden-${o.id}`,
              tipo:   'orden',
              titulo: `Orden #${o.id} detenida`,
              desc:   `En "${o.estado}" hace ${dias} día${dias !== 1 ? 's' : ''}`,
              color:  dias >= 7 ? 'red' : 'orange',
              icon:   'clock',
            });
          }
        });
      }

      setItems(nuevas);
    } catch { /* silencioso */ }
  }, [token]);

  // Polling
  useEffect(() => {
    fetchAlertas();
    const id = setInterval(fetchAlertas, POLL_MS);
    return () => clearInterval(id);
  }, [fetchAlertas]);

  // Cerrar al click fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const noLeidas = items.filter(i => !leidas.has(i.id)).length;

  const marcarTodas = () => {
    const todas = new Set([...leidas, ...items.map(i => i.id)]);
    setLeidas(todas);
    localStorage.setItem('notif_leidas', JSON.stringify([...todas]));
  };

  const marcarUna = (id: string) => {
    const next = new Set([...leidas, id]);
    setLeidas(next);
    localStorage.setItem('notif_leidas', JSON.stringify([...next]));
  };

  const colorMap: Record<string, string> = {
    amber:  'text-amber-400  bg-amber-500/10  border-amber-500/20',
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    red:    'text-red-400    bg-red-500/10    border-red-500/20',
  };

  const dotMap: Record<string, string> = {
    amber:  'bg-amber-400',
    orange: 'bg-orange-400',
    red:    'bg-red-400',
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* ── Botón campana ── */}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10
          border border-transparent hover:border-white/10 transition-all duration-200"
        title="Notificaciones"
      >
        <Bell className="w-5 h-5" />

        {/* Badge */}
        <AnimatePresence>
          {noLeidas > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
                bg-red-500 text-white text-[10px] font-bold rounded-full
                flex items-center justify-center shadow-lg shadow-red-500/50"
            >
              {noLeidas > 9 ? '9+' : noLeidas}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Pulso si hay nuevas */}
        {noLeidas > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 opacity-40 animate-ping" />
        )}
      </button>

      {/* ── Panel desplegable ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{   opacity: 0, y: -8, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96
              bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-2xl
              shadow-2xl shadow-black/50 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-indigo-400" />
                <span className="text-sm font-semibold text-white">Notificaciones</span>
                {noLeidas > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded-full border border-red-500/30">
                    {noLeidas} nueva{noLeidas !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {noLeidas > 0 && (
                  <button onClick={marcarTodas}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400
                      hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Marcar leídas</span>
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5">
              {items.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20
                    flex items-center justify-center mx-auto mb-3">
                    <CheckCheck className="w-6 h-6 text-green-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-300">¡Todo en orden!</p>
                  <p className="text-xs text-gray-500 mt-1">Sin alertas pendientes</p>
                </div>
              ) : (
                <>
                  {/* Sección Stock */}
                  {items.filter(i => i.tipo === 'stock').length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-amber-500/5">
                        <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Stock bajo
                        </p>
                      </div>
                      {items.filter(i => i.tipo === 'stock').map(n => (
                        <NotifItem key={n.id} n={n} leida={leidas.has(n.id)}
                          onRead={marcarUna} colorMap={colorMap} dotMap={dotMap} />
                      ))}
                    </div>
                  )}

                  {/* Sección Órdenes */}
                  {items.filter(i => i.tipo === 'orden').length > 0 && (
                    <div>
                      <div className="px-4 py-2 bg-orange-500/5">
                        <p className="text-[10px] font-semibold text-orange-400 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Órdenes detenidas (+{DIAS_ALERTA} días)
                        </p>
                      </div>
                      {items.filter(i => i.tipo === 'orden').map(n => (
                        <NotifItem key={n.id} n={n} leida={leidas.has(n.id)}
                          onRead={marcarUna} colorMap={colorMap} dotMap={dotMap} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-white/5 bg-gray-800/30">
              <p className="text-[10px] text-gray-500 text-center">
                Actualiza cada 60 seg · {items.length} alerta{items.length !== 1 ? 's' : ''} activa{items.length !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Sub-componente ítem ───────────────────────────────────────────────────────
function NotifItem({ n, leida, onRead, colorMap, dotMap }: {
  n: Notificacion;
  leida: boolean;
  onRead: (id: string) => void;
  colorMap: Record<string, string>;
  dotMap: Record<string, string>;
}) {
  const Icon = n.icon === 'package' ? Package : Clock;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      onClick={() => onRead(n.id)}
      className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors
        ${leida ? 'opacity-50' : 'hover:bg-white/5'}`}
    >
      <div className={`mt-0.5 p-1.5 rounded-lg border shrink-0 ${colorMap[n.color]}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${leida ? 'text-gray-400' : 'text-white'}`}>
          {n.titulo}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
      </div>
      {!leida && (
        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dotMap[n.color]}`} />
      )}
    </motion.div>
  );
}