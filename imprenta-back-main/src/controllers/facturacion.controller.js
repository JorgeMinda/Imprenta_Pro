// src/controllers/facturacion.controller.js
const pool = require('../config/db');

async function generarNumero(client) {
  const res = await client.query(`SELECT COUNT(*) FROM facturas`);
  const n   = Number(res.rows[0].count) + 1;
  return `FAC-${String(n).padStart(6, '0')}`;
}

// ── 1. LISTAR ─────────────────────────────────────────────────────────────
exports.listar = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        f.id,
        f.numero,
        f.orden_id,
        f.cotizacion_id,
        f.subtotal,
        f.impuesto_porcentaje,
        f.impuesto_valor,
        f.total,
        f.estado,
        f.observaciones,
        TO_CHAR(f.fecha_emision, 'YYYY-MM-DD') AS fecha_emision,
        TO_CHAR(f.fecha,        'YYYY-MM-DD') AS fecha,
        c.nombre AS cliente
      FROM facturas f
      LEFT JOIN clientes     c  ON f.cliente_id    = c.id
      LEFT JOIN cotizaciones co ON f.cotizacion_id = co.id
      ORDER BY f.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar facturas:', err);
    res.status(500).json({ msg: 'Error al obtener facturas' });
  }
};

// ── 2. CREAR desde cotización ─────────────────────────────────────────────
exports.crear = async (req, res) => {
  const client = await pool.connect();
  try {
    const { cotizacion_id, impuesto_porcentaje = 15, observaciones } = req.body;
    if (!cotizacion_id)
      return res.status(400).json({ msg: 'cotizacion_id es requerido' });

    await client.query('BEGIN');

    const cotRes = await client.query(`
      SELECT co.id, co.total, co.cliente_id, co.estado
      FROM cotizaciones co WHERE co.id = $1
    `, [cotizacion_id]);

    if (cotRes.rowCount === 0)
      return res.status(404).json({ msg: 'Cotización no encontrada' });

    const cot = cotRes.rows[0];
    if (cot.estado !== 'aprobada')
      return res.status(400).json({ msg: 'Solo se pueden facturar cotizaciones aprobadas' });

    // Verificar duplicado
    const dup = await client.query(
      `SELECT id FROM facturas WHERE cotizacion_id = $1 AND estado != 'anulada'`,
      [cotizacion_id]
    );
    if (dup.rowCount > 0)
      return res.status(400).json({ msg: 'Esta cotización ya tiene una factura activa' });

    const subtotal       = Number(cot.total);
    const impuesto_valor = subtotal * (Number(impuesto_porcentaje) / 100);
    const total          = subtotal + impuesto_valor;
    const numero         = await generarNumero(client);

    const insert = await client.query(`
      INSERT INTO facturas
        (numero, cotizacion_id, cliente_id, subtotal, impuesto_porcentaje,
         impuesto_valor, total, estado, observaciones, fecha_emision)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'pendiente',$8,CURRENT_DATE)
      RETURNING *
    `, [numero, cotizacion_id, cot.cliente_id, subtotal,
        impuesto_porcentaje, impuesto_valor, total, observaciones || null]);

    await client.query('COMMIT');
    res.status(201).json({ msg: 'Factura creada', factura: insert.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear factura:', err);
    res.status(500).json({ msg: 'Error al crear factura' });
  } finally {
    client.release();
  }
};

// ── 3. CAMBIAR ESTADO ─────────────────────────────────────────────────────
exports.cambiarEstado = async (req, res) => {
  const { id }     = req.params;
  const { estado } = req.body;

  if (!['pagada','anulada'].includes(estado))
    return res.status(400).json({ msg: "estado debe ser 'pagada' o 'anulada'" });

  try {
    const result = await pool.query(
      `UPDATE facturas SET estado = $1 WHERE id = $2 RETURNING *`,
      [estado, id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ msg: 'Factura no encontrada' });
    res.json({ msg: `Factura marcada como ${estado}`, factura: result.rows[0] });
  } catch (err) {
    console.error('Error al cambiar estado:', err);
    res.status(500).json({ msg: 'Error al actualizar factura' });
  }
};

// ── 4. ELIMINAR (solo anuladas) ───────────────────────────────────────────
exports.eliminar = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM facturas WHERE id = $1 AND estado = 'anulada' RETURNING id`,
      [id]
    );
    if (result.rowCount === 0)
      return res.status(400).json({ msg: 'Solo se pueden eliminar facturas anuladas' });
    res.json({ msg: 'Factura eliminada' });
  } catch (err) {
    console.error('Error al eliminar factura:', err);
    res.status(500).json({ msg: 'Error al eliminar factura' });
  }
};