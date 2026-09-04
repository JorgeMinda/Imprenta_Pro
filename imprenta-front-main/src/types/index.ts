// ── Usuarios ──────────────────────────────────────────────────────────────────
export interface User {
  id?: string | number;
  nombre: string;
  email: string;
  rol: 'admin' | 'vendedor' | 'empleado' | 'secretaria';
  cedula?: string;
}

// ── Clientes ─────────────────────────────────────────────────────────────────
export interface Cliente {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  direccion: string;
}

// ── Productos ────────────────────────────────────────────────────────────────
export interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio_base: number;
  stock: number;
}

// ── Cotizaciones ─────────────────────────────────────────────────────────────
export interface ProductoDetalle {
  producto_id: number;
  nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Cotizacion {
  id: number;
  cliente_id: number;
  cliente_nombre?: string;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  fecha_creacion: string;
  productos?: ProductoDetalle[];
  total?: number;
}

export interface ItemForm {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

// ── Órdenes de trabajo ───────────────────────────────────────────────────────
export interface Orden {
  id: number;
  cliente_id?: number;
  cliente_nombre?: string;
  producto_nombre?: string;
  descripcion?: string;
  estado: string;
  fecha_creacion: string;
  cantidad?: number;
}

// ── Facturación ──────────────────────────────────────────────────────────────
export interface Factura {
  id: number;
  cotizacion_id: number;
  numero: string;
  estado: string;
  impuesto_porcentaje: number;
  observaciones?: string;
  fecha_creacion: string;
}

// ── Inventario ───────────────────────────────────────────────────────────────
export interface ItemInventario {
  id: number;
  material_id: number;
  nombre: string;
  descripcion: string;
  unidad: string;
  stock_actual: number;
  stock_minimo: number;
}

export interface Movimiento {
  id: number;
  material_id: number;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  fecha: string;
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export interface Stats {
  diseno: number;
  en_proceso: number;
  terminadas: number;
  entregadas: number;
  ganancias: number;
  total_clientes: number;
  ventas_mensuales: { mes: string; ventas: number }[];
}

export interface ProductoAlert {
  id: number;
  nombre: string;
  stock: number;
}

// ── Reportes ─────────────────────────────────────────────────────────────────
export interface ReportesData {
  ventas_mensuales: { mes: string; ventas: number; cotizaciones: number }[];
  top_productos: { nombre: string; total: number }[];
  resumen: {
    total_ventas: number;
    total_cotizaciones: number;
    clientes_nuevos: number;
    ticket_promedio: number;
  };
}

// ── Notificaciones ───────────────────────────────────────────────────────────
export interface AlertaStock {
  material_id: number;
  nombre: string;
  stock_actual: number;
  stock_minimo: number;
}

export interface Notificacion {
  id: string;
  tipo: 'stock' | 'orden';
  titulo: string;
  mensaje: string;
  fecha: string;
}

// ── Contabilidad ─────────────────────────────────────────────────────────────
export interface CuentaContable {
  id: number;
  codigo: string;
  nombre: string;
  tipo: 'activo' | 'pasivo' | 'patrimonio' | 'ingreso' | 'costo' | 'gasto';
  naturaleza: 'deudora' | 'acreedora';
  nivel: number;
  padre_id?: number | null;
  permite_movimiento: boolean;
  activo: boolean;
  saldo?: number;
  total_debito?: number;
  total_credito?: number;
}

export interface LineaAsiento {
  id?: number;
  cuenta_id: number;
  cuenta_codigo?: string;
  cuenta_nombre?: string;
  debito: number;
  credito: number;
  descripcion?: string;
}

export interface AsientoContable {
  id: number;
  numero_asiento: string;
  fecha: string;
  tipo_fuente: 'manual' | 'factura' | 'cobro_cliente' | 'cierre' | string;
  referencia_id?: number | null;
  concepto: string;
  estado: 'borrador' | 'contabilizado' | 'anulado';
  total_debito: number;
  total_credito: number;
  usuario_nombre?: string;
  lineas: LineaAsiento[];
}

export interface BalanceGeneral {
  totalActivos: number;
  totalPasivos: number;
  totalPatrimonio: number;
  pasivoMasPatrimonio: number;
  diferencia: number;
  cuadrado: boolean;
  cuentas: {
    activos: CuentaContable[];
    pasivos: CuentaContable[];
    patrimonio: CuentaContable[];
  };
}

export interface EstadoResultados {
  totalIngresos: number;
  totalCostos: number;
  totalGastos: number;
  utilidadBruta: number;
  utilidadNeta: number;
  cuentas: {
    ingresos: CuentaContable[];
    costos: CuentaContable[];
    gastos: CuentaContable[];
  };
}

export interface MovimientoClienteContable {
  id: number;
  numero: string;
  fecha: string;
  valor_factura: number;
  estado: string;
  cliente_nombre: string;
  cliente_email?: string;
  cliente_telefono?: string;
  pagado: number;
  saldo_pendiente: number;
}

// ── Auditoría y Trazabilidad ─────────────────────────────────────────────────
export interface AuditLog {
  id: number;
  usuario_id?: number | null;
  usuario_nombre?: string;
  usuario_rol?: string;
  modulo: 'clientes' | 'facturas' | 'contabilidad' | 'productos' | 'inventario' | 'cotizaciones' | 'usuarios' | string;
  accion: 'CREAR' | 'EDITAR' | 'DESACTIVAR' | 'ANULAR' | 'ELIMINAR' | string;
  entidad_id?: string | null;
  descripcion: string;
  detalles?: any;
  ip?: string | null;
  fecha: string;
}

export interface AuditStats {
  accionesHoy: number;
  totalBajasOAnulaciones: number;
  topModulos: { modulo: string; total: string | number }[];
  distribucionAcciones: { accion: string; total: string | number }[];
}
