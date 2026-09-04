import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, CheckCircle2, AlertTriangle, Calculator, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '../api/client';
import type { CuentaContable } from '../types';

interface AsientoFormModalProps {
  cuentas: CuentaContable[];
  onClose: () => void;
  onSuccess: () => void;
}

interface LineaForm {
  id: string;
  cuenta_id: number | '';
  debito: number | '';
  credito: number | '';
  descripcion: string;
}

const toastStyle = {
  background: '#1F2937',
  color: 'white',
  borderRadius: '0.75rem',
  border: '1px solid rgba(255,255,255,0.1)',
};

export default function AsientoFormModal({ cuentas, onClose, onSuccess }: AsientoFormModalProps) {
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipoFuente, setTipoFuente] = useState('manual');
  const [concepto, setConcepto] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Cuentas que permiten movimientos
  const cuentasMovibles = cuentas.filter(c => c.permite_movimiento);

  const [lineas, setLineas] = useState<LineaForm[]>([
    { id: '1', cuenta_id: '', debito: '', credito: '', descripcion: '' },
    { id: '2', cuenta_id: '', debito: '', credito: '', descripcion: '' },
  ]);

  // Cálculos en tiempo real
  const totalDebito = lineas.reduce((sum, l) => sum + (Number(l.debito) || 0), 0);
  const totalCredito = lineas.reduce((sum, l) => sum + (Number(l.credito) || 0), 0);
  const diferencia = Math.abs(totalDebito - totalCredito);
  const estaBalanceado = totalDebito > 0 && diferencia < 0.005;

  const agregarLinea = () => {
    setLineas(prev => [
      ...prev,
      { id: String(Date.now()), cuenta_id: '', debito: '', credito: '', descripcion: '' },
    ]);
  };

  const eliminarLinea = (index: number) => {
    if (lineas.length <= 2) {
      toast.error('El asiento debe tener al menos 2 líneas', { style: toastStyle });
      return;
    }
    setLineas(prev => prev.filter((_, i) => i !== index));
  };

  const actualizarLinea = (index: number, campo: keyof LineaForm, valor: any) => {
    setLineas(prev => {
      const copy = [...prev];
      const lineaActual = { ...copy[index], [campo]: valor };

      // Si escribe débito > 0, limpiar crédito
      if (campo === 'debito' && Number(valor) > 0) {
        lineaActual.credito = '';
      }
      // Si escribe crédito > 0, limpiar débito
      if (campo === 'credito' && Number(valor) > 0) {
        lineaActual.debito = '';
      }

      copy[index] = lineaActual;
      return copy;
    });
  };

  // Botón rápido para auto-cuadrar la línea
  const autoCuadrar = (index: number) => {
    if (diferencia <= 0) return;
    if (totalDebito > totalCredito) {
      actualizarLinea(index, 'credito', Number(diferencia.toFixed(2)));
    } else {
      actualizarLinea(index, 'debito', Number(diferencia.toFixed(2)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!concepto.trim()) {
      return toast.error('El concepto del asiento es requerido', { style: toastStyle });
    }

    if (!estaBalanceado) {
      return toast.error(`El asiento no está balanceado. Diferencia: $${diferencia.toFixed(2)}`, { style: toastStyle });
    }

    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      if (!l.cuenta_id) {
        return toast.error(`Selecciona una cuenta en la línea ${i + 1}`, { style: toastStyle });
      }
      const deb = Number(l.debito) || 0;
      const cred = Number(l.credito) || 0;
      if (deb === 0 && cred === 0) {
        return toast.error(`Ingresa un valor de Débito o Crédito en la línea ${i + 1}`, { style: toastStyle });
      }
    }

    setGuardando(true);
    try {
      await apiClient.post('/api/contabilidad/asientos', {
        fecha,
        tipo_fuente: tipoFuente,
        concepto: concepto.trim(),
        lineas: lineas.map(l => ({
          cuenta_id: Number(l.cuenta_id),
          debito: Number(l.debito) || 0,
          credito: Number(l.credito) || 0,
          descripcion: l.descripcion.trim() || undefined,
        })),
      });

      toast.success('¡Asiento contable registrado con éxito!', { style: toastStyle });
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Error al guardar asiento', { style: toastStyle });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-4xl glass-float my-8 max-h-[90vh] flex flex-col"
      >
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Nuevo Asiento Contable</h3>
              <p className="text-xs text-gray-400">Registro de partida doble (Débito = Crédito)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Fila 1: Datos Generales */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Fecha del Asiento *
              </label>
              <input
                type="date"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
                required
                className="w-full bg-gray-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Tipo / Origen *
              </label>
              <select
                value={tipoFuente}
                onChange={e => setTipoFuente(e.target.value)}
                className="w-full bg-gray-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition"
              >
                <option value="manual">Ajuste Manual</option>
                <option value="factura">Facturación de Venta</option>
                <option value="cobro_cliente">Cobro a Cliente / Cartera</option>
                <option value="compra">Compra de Suministros / Papel</option>
                <option value="cierre">Cierre de Periodo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Concepto / Glosa General *
              </label>
              <input
                type="text"
                placeholder="Ej. Registro de ventas del día..."
                value={concepto}
                onChange={e => setConcepto(e.target.value)}
                required
                className="w-full bg-gray-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-indigo-500 outline-none transition placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Fila 2: Grilla Dinámica de Movimientos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                Líneas de Movimiento Contable
              </h4>
              <button
                type="button"
                onClick={agregarLinea}
                className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus className="w-4 h-4" /> Agregar Cuenta
              </button>
            </div>

            <div className="space-y-2">
              {lineas.map((linea, index) => (
                <div
                  key={linea.id}
                  className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 bg-gray-900/40 border border-white/5 rounded-xl items-center"
                >
                  {/* Selector de Cuenta (col 5) */}
                  <div className="sm:col-span-5">
                    <select
                      value={linea.cuenta_id}
                      onChange={e => actualizarLinea(index, 'cuenta_id', Number(e.target.value) || '')}
                      required
                      className="w-full bg-gray-800/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none transition"
                    >
                      <option value="">Seleccionar cuenta contable...</option>
                      {cuentasMovibles.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.codigo} — {c.nombre} ({c.naturaleza === 'deudora' ? 'Debe' : 'Haber'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Campo Débito (col 2) */}
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Débito ($)"
                      value={linea.debito}
                      onChange={e => actualizarLinea(index, 'debito', e.target.value)}
                      className="w-full bg-gray-800/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none text-right font-mono transition placeholder:text-gray-600"
                    />
                  </div>

                  {/* Campo Crédito (col 2) */}
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Crédito ($)"
                      value={linea.credito}
                      onChange={e => actualizarLinea(index, 'credito', e.target.value)}
                      className="w-full bg-gray-800/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none text-right font-mono transition placeholder:text-gray-600"
                    />
                  </div>

                  {/* Detalle de línea (col 2) */}
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      placeholder="Detalle línea..."
                      value={linea.descripcion}
                      onChange={e => actualizarLinea(index, 'descripcion', e.target.value)}
                      className="w-full bg-gray-800/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-indigo-500 outline-none transition placeholder:text-gray-600"
                    />
                  </div>

                  {/* Botones de acción (col 1) */}
                  <div className="sm:col-span-1 flex items-center justify-end gap-1">
                    {!estaBalanceado && diferencia > 0 && (
                      <button
                        type="button"
                        onClick={() => autoCuadrar(index)}
                        title="Auto-cuadrar monto restante"
                        className="p-1.5 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition text-xs font-bold"
                      >
                        ⚡
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => eliminarLinea(index)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                      title="Eliminar fila"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Semáforo y Barra de Balance en Tiempo Real */}
          <div className={`p-4 rounded-2xl border transition-all duration-300 ${
            estaBalanceado
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {estaBalanceado ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 animate-pulse" />
                )}
                <div>
                  <h5 className="text-sm font-bold">
                    {estaBalanceado ? 'Asiento Cuadrado y Balanceado' : 'Asiento Descuadrado (Partida Doble)'}
                  </h5>
                  <p className="text-xs text-gray-300">
                    {estaBalanceado
                      ? 'Las sumas del Débito y Crédito son exactamente iguales.'
                      : `Diferencia pendiente por balancear: $${diferencia.toFixed(2)}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 font-mono text-sm">
                <div>
                  <span className="text-xs text-gray-400 block uppercase">Total Débito</span>
                  <span className="font-bold text-white">${totalDebito.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-400 block uppercase">Total Crédito</span>
                  <span className="font-bold text-white">${totalCredito.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Pie del Modal */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10 bg-gray-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 font-semibold text-sm transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!estaBalanceado || guardando}
            className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
          >
            {guardando ? 'Guardando...' : 'Contabilizar Asiento'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
