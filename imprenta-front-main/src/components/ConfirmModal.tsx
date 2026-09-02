// src/components/ConfirmModal.tsx
// Uso: const { confirmar } = useConfirm();
//      await confirmar({ titulo, mensaje, variante }) → true/false

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, CheckCircle, X } from 'lucide-react';

// ── Tipos ────────────────────────────────────────────────────────────────────
type Variante = 'danger' | 'warning' | 'success' | 'info';

interface ConfirmOptions {
  titulo:       string;
  mensaje:      string;
  variante?:    Variante;
  labelOk?:     string;
  labelCancel?: string;
}

interface ConfirmContextType {
  confirmar: (opts: ConfirmOptions) => Promise<boolean>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider');
  return ctx;
}

// ── Config visual por variante ───────────────────────────────────────────────
const VARIANTE_CFG: Record<Variante, {
  icon: React.ReactNode;
  iconBg: string;
  btnOk: string;
  titulo: string;
}> = {
  danger: {
    icon:   <Trash2     className="w-6 h-6 text-red-400" />,
    iconBg: 'bg-red-500/15 border-red-500/30',
    btnOk:  'bg-red-600 hover:bg-red-500 shadow-red-500/30',
    titulo: 'text-red-400',
  },
  warning: {
    icon:   <AlertTriangle className="w-6 h-6 text-amber-400" />,
    iconBg: 'bg-amber-500/15 border-amber-500/30',
    btnOk:  'bg-amber-600 hover:bg-amber-500 shadow-amber-500/30',
    titulo: 'text-amber-400',
  },
  success: {
    icon:   <CheckCircle className="w-6 h-6 text-emerald-400" />,
    iconBg: 'bg-emerald-500/15 border-emerald-500/30',
    btnOk:  'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30',
    titulo: 'text-emerald-400',
  },
  info: {
    icon:   <CheckCircle className="w-6 h-6 text-indigo-400" />,
    iconBg: 'bg-indigo-500/15 border-indigo-500/30',
    btnOk:  'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30',
    titulo: 'text-indigo-400',
  },
};

// ── Provider ──────────────────────────────────────────────────────────────────
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts,    setOpts]    = useState<ConfirmOptions | null>(null);
  const [resolve, setResolve] = useState<((v: boolean) => void) | null>(null);

  const confirmar = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise(res => {
      setOpts(options);
      setResolve(() => res);
    });
  }, []);

  const responder = (valor: boolean) => {
    resolve?.(valor);
    setOpts(null);
    setResolve(null);
  };

  const cfg = opts ? VARIANTE_CFG[opts.variante ?? 'danger'] : null;

  return (
    <ConfirmContext.Provider value={{ confirmar }}>
      {children}

      <AnimatePresence>
        {opts && cfg && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
              onClick={() => responder(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9,  y: 20 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{   opacity: 0, scale: 0.92,  y: 10 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                w-full max-w-sm z-[101] mx-4"
            >
              <div className="bg-gray-900 border border-white/10 rounded-2xl shadow-2xl
                shadow-black/60 overflow-hidden">

                {/* Header con ícono */}
                <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${cfg.iconBg}`}>
                    {cfg.icon}
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold ${cfg.titulo}`}>{opts.titulo}</h3>
                    <p className="text-sm text-gray-400 mt-1.5 leading-relaxed">{opts.mensaje}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/5" />

                {/* Botones */}
                <div className="flex gap-3 p-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => responder(false)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4
                      rounded-xl bg-gray-800 hover:bg-gray-700 border border-white/10
                      text-gray-300 hover:text-white text-sm font-medium transition-all"
                  >
                    <X className="w-4 h-4" />
                    {opts.labelCancel ?? 'Cancelar'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => responder(true)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4
                      rounded-xl text-white text-sm font-semibold shadow-lg transition-all ${cfg.btnOk}`}
                  >
                    {cfg.icon}
                    {opts.labelOk ?? 'Confirmar'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}