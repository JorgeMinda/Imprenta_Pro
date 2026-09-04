// src/repositories/contabilidad.repository.js
const pool = require('../config/db');

class ContabilidadRepository {
  // ── 1. CUENTAS CONTABLES ──────────────────────────────────────────────────
  async listarCuentas() {
    const res = await pool.query(`
      SELECT 
        id, codigo, nombre, tipo, naturaleza, nivel, padre_id, permite_movimiento, activo,
        TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at
      FROM cuentas_contables
      WHERE activo = true
      ORDER BY codigo ASC
    `);
    return res.rows;
  }

  async obtenerCuentaPorId(id, db = pool) {
    const res = await db.query(
      `SELECT * FROM cuentas_contables WHERE id = $1 AND activo = true`,
      [id]
    );
    return res.rows[0] || null;
  }

  async obtenerCuentaPorCodigo(codigo, db = pool) {
    const res = await db.query(
      `SELECT * FROM cuentas_contables WHERE codigo = $1 AND activo = true`,
      [codigo]
    );
    return res.rows[0] || null;
  }

  async crearCuenta({ codigo, nombre, tipo, naturaleza, nivel, padre_id, permite_movimiento }) {
    const res = await pool.query(`
      INSERT INTO cuentas_contables (codigo, nombre, tipo, naturaleza, nivel, padre_id, permite_movimiento)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [codigo, nombre, tipo, naturaleza, nivel, padre_id || null, permite_movimiento ?? true]);
    return res.rows[0];
  }

  // ── 2. ASIENTOS CONTABLES ─────────────────────────────────────────────────
  async generarNumeroAsiento(db = pool) {
    const res = await db.query(`SELECT COUNT(*) FROM asientos_contables`);
    const n = Number(res.rows[0].count) + 1;
    return `AST-${String(n).padStart(6, '0')}`;
  }

  async crearAsientoCabecera(client, { numero_asiento, fecha, tipo_fuente, referencia_id, concepto, estado, total_debito, total_credito, usuario_id }) {
    const res = await client.query(`
      INSERT INTO asientos_contables 
        (numero_asiento, fecha, tipo_fuente, referencia_id, concepto, estado, total_debito, total_credito, usuario_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [numero_asiento, fecha || new Date(), tipo_fuente || 'manual', referencia_id || null, concepto, estado || 'contabilizado', total_debito, total_credito, usuario_id || null]);
    return res.rows[0];
  }

  async crearLineaAsiento(client, { asiento_id, cuenta_id, debito, credito, descripcion }) {
    const res = await client.query(`
      INSERT INTO lineas_asiento (asiento_id, cuenta_id, debito, credito, descripcion)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [asiento_id, cuenta_id, debito || 0, credito || 0, descripcion || null]);
    return res.rows[0];
  }

  async listarAsientos({ fechaInicio, fechaFin, tipoFuente, estado, busqueda } = {}) {
    let query = `
      SELECT 
        a.id,
        a.numero_asiento,
        TO_CHAR(a.fecha, 'YYYY-MM-DD') AS fecha,
        a.tipo_fuente,
        a.referencia_id,
        a.concepto,
        a.estado,
        a.total_debito,
        a.total_credito,
        u.nombre AS usuario_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'id', l.id,
              'cuenta_id', l.cuenta_id,
              'cuenta_codigo', c.codigo,
              'cuenta_nombre', c.nombre,
              'debito', l.debito,
              'credito', l.credito,
              'descripcion', l.descripcion
            ) ORDER BY l.id ASC
          ) FILTER (WHERE l.id IS NOT NULL), '[]'
        ) AS lineas
      FROM asientos_contables a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN lineas_asiento l ON a.id = l.asiento_id
      LEFT JOIN cuentas_contables c ON l.cuenta_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (fechaInicio) {
      params.push(fechaInicio);
      query += ` AND a.fecha >= $${params.length}`;
    }
    if (fechaFin) {
      params.push(fechaFin);
      query += ` AND a.fecha <= $${params.length}`;
    }
    if (tipoFuente && tipoFuente !== 'todos') {
      params.push(tipoFuente);
      query += ` AND a.tipo_fuente = $${params.length}`;
    }
    if (estado && estado !== 'todos') {
      params.push(estado);
      query += ` AND a.estado = $${params.length}`;
    }
    if (busqueda && busqueda.trim()) {
      params.push(`%${busqueda.trim().toLowerCase()}%`);
      query += ` AND (LOWER(a.numero_asiento) LIKE $${params.length} OR LOWER(a.concepto) LIKE $${params.length})`;
    }

    query += `
      GROUP BY a.id, u.nombre
      ORDER BY a.fecha DESC, a.id DESC
    `;

    const res = await pool.query(query, params);
    return res.rows;
  }

  async obtenerAsientoPorId(id, db = pool) {
    const res = await db.query(`
      SELECT 
        a.id,
        a.numero_asiento,
        TO_CHAR(a.fecha, 'YYYY-MM-DD') AS fecha,
        a.tipo_fuente,
        a.referencia_id,
        a.concepto,
        a.estado,
        a.total_debito,
        a.total_credito,
        u.nombre AS usuario_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'id', l.id,
              'cuenta_id', l.cuenta_id,
              'cuenta_codigo', c.codigo,
              'cuenta_nombre', c.nombre,
              'debito', l.debito,
              'credito', l.credito,
              'descripcion', l.descripcion
            ) ORDER BY l.id ASC
          ) FILTER (WHERE l.id IS NOT NULL), '[]'
        ) AS lineas
      FROM asientos_contables a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      LEFT JOIN lineas_asiento l ON a.id = l.asiento_id
      LEFT JOIN cuentas_contables c ON l.cuenta_id = c.id
      WHERE a.id = $1
      GROUP BY a.id, u.nombre
    `, [id]);
    return res.rows[0] || null;
  }

  async anularAsiento(client, id) {
    const res = await client.query(`
      UPDATE asientos_contables 
      SET estado = 'anulado'
      WHERE id = $1
      RETURNING *
    `, [id]);
    return res.rows[0] || null;
  }

  async registrarAuditLog(client, { asiento_id, usuario_id, accion, detalles }) {
    await client.query(`
      INSERT INTO audit_logs_contable (asiento_id, usuario_id, accion, detalles)
      VALUES ($1, $2, $3, $4)
    `, [asiento_id || null, usuario_id || null, accion, JSON.stringify(detalles || {})]);
  }

  // ── 3. REPORTES CONTABLES AGREGADOS (SQL PURO) ───────────────────────────
  async obtenerLibroMayor(cuentaId, fechaInicio, fechaFin) {
    let query = `
      SELECT 
        l.id AS linea_id,
        a.id AS asiento_id,
        a.numero_asiento,
        TO_CHAR(a.fecha, 'YYYY-MM-DD') AS fecha,
        a.concepto AS glosa_asiento,
        l.descripcion AS linea_descripcion,
        l.debito,
        l.credito,
        c.codigo AS cuenta_codigo,
        c.nombre AS cuenta_nombre,
        c.naturaleza
      FROM lineas_asiento l
      JOIN asientos_contables a ON l.asiento_id = a.id
      JOIN cuentas_contables c ON l.cuenta_id = c.id
      WHERE l.cuenta_id = $1
        AND a.estado = 'contabilizado'
    `;
    const params = [cuentaId];

    if (fechaInicio) {
      params.push(fechaInicio);
      query += ` AND a.fecha >= $${params.length}`;
    }
    if (fechaFin) {
      params.push(fechaFin);
      query += ` AND a.fecha <= $${params.length}`;
    }

    query += ` ORDER BY a.fecha ASC, a.id ASC, l.id ASC`;

    const res = await pool.query(query, params);
    return res.rows;
  }

  async obtenerBalanceGeneral() {
    const res = await pool.query(`
      SELECT 
        c.id,
        c.codigo,
        c.nombre,
        c.tipo,
        c.naturaleza,
        c.nivel,
        c.padre_id,
        c.permite_movimiento,
        COALESCE(SUM(l.debito), 0) AS total_debito,
        COALESCE(SUM(l.credito), 0) AS total_credito,
        CASE 
          WHEN c.naturaleza = 'deudora' THEN COALESCE(SUM(l.debito), 0) - COALESCE(SUM(l.credito), 0)
          ELSE COALESCE(SUM(l.credito), 0) - COALESCE(SUM(l.debito), 0)
        END AS saldo
      FROM cuentas_contables c
      LEFT JOIN lineas_asiento l ON c.id = l.cuenta_id
      LEFT JOIN asientos_contables a ON l.asiento_id = a.id AND a.estado = 'contabilizado'
      WHERE c.activo = true 
        AND c.tipo IN ('activo', 'pasivo', 'patrimonio')
      GROUP BY c.id
      ORDER BY c.codigo ASC
    `);
    return res.rows;
  }

  async obtenerEstadoResultados(fechaInicio, fechaFin) {
    let dateFilter = '';
    const params = [];

    if (fechaInicio) {
      params.push(fechaInicio);
      dateFilter += ` AND a.fecha >= $${params.length}`;
    }
    if (fechaFin) {
      params.push(fechaFin);
      dateFilter += ` AND a.fecha <= $${params.length}`;
    }

    const res = await pool.query(`
      SELECT 
        c.id,
        c.codigo,
        c.nombre,
        c.tipo,
        c.naturaleza,
        c.nivel,
        c.padre_id,
        c.permite_movimiento,
        COALESCE(SUM(l.debito), 0) AS total_debito,
        COALESCE(SUM(l.credito), 0) AS total_credito,
        CASE 
          WHEN c.naturaleza = 'acreedora' THEN COALESCE(SUM(l.credito), 0) - COALESCE(SUM(l.debito), 0)
          ELSE COALESCE(SUM(l.debito), 0) - COALESCE(SUM(l.credito), 0)
        END AS saldo
      FROM cuentas_contables c
      LEFT JOIN lineas_asiento l ON c.id = l.cuenta_id
      LEFT JOIN asientos_contables a ON l.asiento_id = a.id AND a.estado = 'contabilizado' ${dateFilter}
      WHERE c.activo = true 
        AND c.tipo IN ('ingreso', 'costo', 'gasto')
      GROUP BY c.id
      ORDER BY c.codigo ASC
    `, params);
    return res.rows;
  }

  async obtenerEstadoCuentaCliente(clienteId) {
    const res = await pool.query(`
      SELECT 
        f.id,
        f.numero,
        TO_CHAR(COALESCE(f.fecha_emision, f.fecha, CURRENT_DATE), 'YYYY-MM-DD') AS fecha,
        f.total AS valor_factura,
        f.estado,
        cl.nombre AS cliente_nombre,
        cl.email AS cliente_email,
        cl.telefono AS cliente_telefono,
        CASE WHEN f.estado = 'pagada' THEN f.total ELSE 0 END AS pagado,
        CASE WHEN f.estado = 'pendiente' THEN f.total ELSE 0 END AS saldo_pendiente
      FROM facturas f
      JOIN clientes cl ON f.cliente_id = cl.id
      WHERE f.cliente_id = $1 AND f.estado != 'anulada'
      ORDER BY f.fecha_emision DESC
    `, [clienteId]);
    return res.rows;
  }
}

module.exports = new ContabilidadRepository();
