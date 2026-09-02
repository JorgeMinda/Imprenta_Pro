// src/controllers/cotizacion.controller.js — con estado corregido
const pool = require('../config/db');

// --- 1. CREAR COTIZACIÓN ---
exports.crearCotizacion = async (req, res) => {
  const client = await pool.connect();
  try {
    const { cliente_id, productos, estado = 'Pendiente' } = req.body;
    const creado_por = req.user.id;

    if (!productos || productos.length === 0)
      return res.status(400).json({ msg: 'Debe agregar al menos un producto' });

    await client.query('BEGIN');

    const cotizacionResult = await client.query(
      `INSERT INTO cotizaciones (cliente_id, total, estado, creado_por, fecha)
       VALUES ($1, 0, $2, $3, CURRENT_TIMESTAMP) RETURNING id`,
      [cliente_id, estado, creado_por]
    );
    const cotizacion_id = cotizacionResult.rows[0].id;

    let total = 0;
    for (const item of productos) {
      const subtotal = item.cantidad * item.precio_unitario;
      total += subtotal;
      await client.query(
        `INSERT INTO detalle_cotizacion (cotizacion_id, producto_id, cantidad, precio_unitario, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [cotizacion_id, item.producto_id, item.cantidad, item.precio_unitario, subtotal]
      );
    }

    await client.query(`UPDATE cotizaciones SET total=$1 WHERE id=$2`, [total, cotizacion_id]);
    await client.query('COMMIT');

    res.json({ msg: 'Cotización creada correctamente', cotizacion_id, total });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ msg: 'Error al crear cotización' });
  } finally {
    client.release();
  }
};

// --- 2. LISTAR COTIZACIONES ---
exports.listarCotizaciones = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        cl.nombre  AS cliente,
        c.total,
        c.estado,
        c.activo,
        TO_CHAR(c.fecha,'YYYY-MM-DD') AS fecha,
        json_agg(json_build_object(
          'producto',        p.nombre,
          'cantidad',        d.cantidad,
          'precio_unitario', d.precio_unitario,
          'subtotal',        d.subtotal
        )) AS productos
      FROM cotizaciones c
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      LEFT JOIN detalle_cotizacion d ON d.cotizacion_id = c.id
      LEFT JOIN productos p ON p.id = d.producto_id
      WHERE COALESCE(c.activo, true) = true
      GROUP BY c.id, cl.nombre
      ORDER BY c.fecha DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al listar cotizaciones' });
  }
};

// --- 3. APROBAR COTIZACIÓN → crea orden con estado correcto de BD ---
exports.aprobarCotizacion = async (req, res) => {
  const { id } = req.params;
  const empleado_id = req.user.id;
  try {
    await pool.query('BEGIN');

    const cotizacionUpdate = await pool.query(
      `UPDATE cotizaciones SET estado = 'Aprobada' WHERE id = $1 RETURNING *`, [id]
    );
    if (cotizacionUpdate.rowCount === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ msg: 'Cotización no encontrada' });
    }

    // CORRECCIÓN: estado 'diseño' en minúsculas para coincidir con el default de la BD
    const orden = await pool.query(
      `INSERT INTO ordenes_trabajo (cotizacion_id, empleado_id, estado, fecha_inicio, observaciones)
       VALUES ($1, $2, 'diseño', CURRENT_TIMESTAMP, 'Orden generada desde cotización aprobada')
       RETURNING id`,
      [id, empleado_id]
    );

    await pool.query('COMMIT');
    res.json({ msg: 'Cotización aprobada y orden creada', orden_id: orden.rows[0].id });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error al aprobar cotización:', err);
    res.status(500).json({ msg: 'Error al aprobar cotización' });
  }
};

// --- 4. RECHAZAR COTIZACIÓN ---
exports.rechazarCotizacion = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `UPDATE cotizaciones SET estado = 'Rechazada' WHERE id = $1 RETURNING *`, [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ msg: 'Cotización no encontrada' });
    res.json({ msg: 'Cotización rechazada correctamente' });
  } catch (err) {
    console.error('Error al rechazar cotización:', err);
    res.status(500).json({ msg: 'Error al rechazar cotización' });
  }
};

// --- 5. ELIMINAR / ANULAR COTIZACIÓN ---
exports.eliminarCotizacion = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE cotizaciones SET activo = FALSE, estado = 'ANULADA' WHERE id = $1`, [id]
    );
    res.json({ msg: 'Cotización anulada correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al anular cotización' });
  }
};