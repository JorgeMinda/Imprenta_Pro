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
