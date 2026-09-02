// src/components/BusquedaGlobal.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, X, Users, Package, ClipboardList,
  FileText, ArrowRight, Loader2, Command
} from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────────────────────
interface Resultado {
  id:       number;
  tipo:     'cliente' | 'producto' | 'orden' | 'cotizacion';
  titulo:   string;
  subtitulo: string;
  ruta:     string;
}

const TIPO_CONFIG = {
  cliente:    { label: 'Clientes',     icon: Users,        color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   ruta: '/clientes' },
  producto:   { label: 'Productos',    icon: Package,      color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20', ruta: '/productos' },
  orden:      { label: 'Órdenes',      icon: ClipboardList,color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20',  ruta: '/ordenes' },
  cotizacion: { label: 'Cotizaciones', icon: FileText,     color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20',    ruta: '/cotizaciones' },
};

// ── Hook de debounce ─────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function BusquedaGlobal() {
  const navigate  = useNavigate();

  const [open,      setOpen]      = useState(false);
  const [query,     setQuery]     = useState('');
  const [resultados,setResultados]= useState<Resultado[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [selIdx,    setSelIdx]    = useState(0);

  const inputRef  = useRef<HTMLInputElement>(null);
  const listRef   = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 280);

  // ── Atajos de teclado globales ────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResultados([]);
      setSelIdx(0);
    }
  }, [open]);

  // ── Búsqueda ──────────────────────────────────────────────────────────────
  const buscar = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) { setResultados([]); return; }

    setLoading(true);

    try {
      const [clientes, productos, ordenes, cotizaciones] = await Promise.all([
        apiClient.get<any[]>('/api/clientes'),
        apiClient.get<any[]>('/api/productos'),
        apiClient.get<any[]>('/api/ordenes_trabajo'),
        apiClient.get<any[]>('/api/cotizaciones'),
      ]);

      const qLow = q.toLowerCase();
      const resultados: Resultado[] = [];

      // Clientes
      clientes
        .filter(c =>
          c.nombre?.toLowerCase().includes(qLow) ||
          c.email?.toLowerCase().includes(qLow)  ||
          c.telefono?.toLowerCase().includes(qLow)
        )
        .slice(0, 4)
        .forEach(c => resultados.push({
          id: c.id, tipo: 'cliente',
          titulo:    c.nombre,
          subtitulo: c.email || c.telefono || 'Sin contacto',
          ruta:      '/clientes',
        }));

      // Productos
      productos
        .filter(p =>
          p.nombre?.toLowerCase().includes(qLow) ||
          p.descripcion?.toLowerCase().includes(qLow)
        )
        .slice(0, 4)
        .forEach(p => resultados.push({
          id: p.id, tipo: 'producto',
          titulo:    p.nombre,
          subtitulo: p.precio_base ? `$${Number(p.precio_base).toFixed(2)}` : 'Sin precio',
          ruta:      '/productos',
        }));

      // Órdenes
      ordenes
        .filter(o =>
          String(o.id).includes(qLow)                 ||
          o.estado?.toLowerCase().includes(qLow)      ||
          o.cliente?.toLowerCase().includes(qLow)
        )
        .slice(0, 4)
        .forEach(o => resultados.push({
          id: o.id, tipo: 'orden',
          titulo:    `Orden #${o.id}`,
          subtitulo: `${o.estado} · ${o.cliente || 'Sin cliente'}`,
          ruta:      '/ordenes',
        }));

      // Cotizaciones
      cotizaciones
        .filter(c =>
          String(c.id).includes(qLow)              ||
          c.cliente?.toLowerCase().includes(qLow)  ||
          c.estado?.toLowerCase().includes(qLow)
        )
        .slice(0, 3)
        .forEach(c => resultados.push({
          id: c.id, tipo: 'cotizacion',
          titulo:    `Cotización #${c.id}`,
          subtitulo: `${c.cliente || 'Sin cliente'} · $${Number(c.total).toFixed(2)}`,
          ruta:      '/cotizaciones',
        }));

      setResultados(resultados);
      setSelIdx(0);
    } catch { /* silencioso */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { buscar(debouncedQuery); }, [debouncedQuery, buscar]);

  // ── Navegación por teclado ────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelIdx(i => Math.min(i + 1, resultados.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && resultados[selIdx]) {
      irA(resultados[selIdx]);
    }
  };

  // Scroll automático al ítem seleccionado
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selIdx]);

  const irA = (r: Resultado) => {
    navigate(r.ruta);
    setOpen(false);
  };

  // Agrupar por tipo
  const grupos = Object.keys(TIPO_CONFIG) as (keyof typeof TIPO_CONFIG)[];
  const porTipo = grupos.reduce((acc, tipo) => {
    acc[tipo] = resultados.filter(r => r.tipo === tipo);
    return acc;
  }, {} as Record<string, Resultado[]>);

  const flatIdx = (r: Resultado) => resultados.indexOf(r);

  return (
    <>
      {/* ── Botón trigger en navbar ── */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl
          bg-gray-800/50 hover:bg-gray-700/60 border border-white/10
          text-gray-400 hover:text-white transition-all duration-200 text-sm"
      >
        <Search className="w-4 h-4" />
        <span className="text-gray-500">Buscar…</span>
        <kbd className="ml-2 flex items-center gap-0.5 px-1.5 py-0.5
          bg-gray-700/60 border border-white/10 rounded text-[10px] text-gray-400 font-mono">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      {/* Botón mobile (solo ícono) */}
      <button
        onClick={() => setOpen(true)}
        className="sm:hidden p-2 rounded-xl text-gray-400 hover:text-white
          hover:bg-white/10 border border-transparent hover:border-white/10 transition-all"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* ── Modal de búsqueda ── */}
      <AnimatePresence key="busqueda-modal">
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              key="busqueda-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 glass-overlay z-50"
            />

{/* Panel */}
            <motion.div
              key="busqueda-panel"
              initial={{ opacity: 0, y: -20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,   scale: 1 }}
              exit={{   opacity: 0, y: -20,  scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="fixed top-[8vh] left-1/2 -translate-x-1/2 w-full max-w-xl z-50
                glass-float overflow-hidden"
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
                {loading
                  ? <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                  : <Search className="w-5 h-5 text-gray-400 shrink-0" />
                }
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar clientes, órdenes, productos…"
                  className="flex-1 bg-transparent text-white placeholder-gray-500
                    text-base outline-none"
                />
                {query && (
                  <button onClick={() => { setQuery(''); setResultados([]); inputRef.current?.focus(); }}
                    className="p-1 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="px-2 py-1 bg-gray-800 border border-white/10 rounded text-[10px]
                  text-gray-400 font-mono hidden sm:block">
                  ESC
                </kbd>
              </div>

              {/* Resultados */}
              <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
                {!query || query.length < 2 ? (
                  // Estado vacío / hint
                  <div className="py-10 text-center space-y-3">
                    <Search className="w-10 h-10 text-gray-700 mx-auto" />
                    <p className="text-sm text-gray-500">Escribe al menos 2 caracteres para buscar</p>
                    <div className="flex items-center justify-center gap-4 pt-2">
                      {grupos.map(tipo => {
                        const cfg = TIPO_CONFIG[tipo];
                        const Icon = cfg.icon;
                        return (
                          <div key={tipo} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <Icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : resultados.length === 0 && !loading ? (
                  <div className="py-10 text-center">
                    <p className="text-sm text-gray-500">Sin resultados para <span className="text-white">"{query}"</span></p>
                  </div>
                ) : (
                  <div className="py-2">
                    {grupos.map(tipo => {
                      const items = porTipo[tipo];
                      if (!items?.length) return null;
                      const cfg  = TIPO_CONFIG[tipo];
                      const Icon = cfg.icon;
                      return (
                        <div key={tipo} className="mb-1">
                          {/* Cabecera de grupo */}
                          <div className="px-4 py-1.5 flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                              {cfg.label}
                            </span>
                          </div>

                          {items.map(r => {
                            const idx     = flatIdx(r);
                            const activo  = idx === selIdx;
                            return (
                              <div
                                key={`${r.tipo}-${r.id}`}
                                data-idx={idx}
                                onClick={() => irA(r)}
                                onMouseEnter={() => setSelIdx(idx)}
                                className={`flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl cursor-pointer
                                  transition-all duration-100
                                  ${activo ? 'bg-indigo-500/15 border border-indigo-500/20' : 'hover:bg-white/5 border border-transparent'}`}
                              >
                                <div className={`p-1.5 rounded-lg border shrink-0 ${cfg.bg}`}>
                                  <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">{r.titulo}</p>
                                  <p className="text-xs text-gray-500 truncate">{r.subtitulo}</p>
                                </div>
                                <ArrowRight className={`w-4 h-4 shrink-0 transition-colors
                                  ${activo ? 'text-indigo-400' : 'text-gray-700'}`}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer con atajos */}
              {resultados.length > 0 && (
                <div className="px-4 py-2 border-t border-white/5 bg-gray-800/20
                  flex items-center gap-4 text-[10px] text-gray-600">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-800 border border-white/10 rounded font-mono">↑↓</kbd>
                    Navegar
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-800 border border-white/10 rounded font-mono">↵</kbd>
                    Ir a sección
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-gray-800 border border-white/10 rounded font-mono">ESC</kbd>
                    Cerrar
                  </span>
                  <span className="ml-auto">{resultados.length} resultado{resultados.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}