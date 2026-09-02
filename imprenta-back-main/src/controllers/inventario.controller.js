// src/controllers/inventario.controller.js
const pool = require('../config/db');

// ── 1. LISTAR INVENTARIO ─────────────────────────────────────────────────────
exports.listarInventario = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        i.id,
        m.id          AS material_id,
        m.nombre      AS material,
        m.descripcion,
        m.unidad,
        i.stock_actual,
        i.stock_minimo,
        CASE WHEN i.stock_actual <= i.stock_minimo THEN true ELSE false END AS alerta
      FROM inventario i
      JOIN materiales m ON i.material_id = m.id
      ORDER BY m.nombre ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar inventario:', err);
    res.status(500).json({ msg: 'Error al obtener inventario' });
  }
};

// ── 2. LISTAR MATERIALES (para dropdowns) ────────────────────────────────────
exports.listarMateriales = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, nombre, descripcion, unidad FROM materiales ORDER BY nombre ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar materiales:', err);
    res.status(500).json({ msg: 'Error al obtener materiales' });
  }
};

// ── 3. CREAR MATERIAL + INVENTARIO ──────────────────────────────────────────
exports.crearMaterial = async (req, res) => {
  const client = await pool.connect();
  try {
    const { nombre, descripcion, unidad, stock_actual = 0, stock_minimo = 5 } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ msg: 'El nombre es requerido' });
    if (!unidad?.trim()) return res.status(400).json({ msg: 'La unidad es requerida' });

    await client.query('BEGIN');

    const mat = await client.query(
      `INSERT INTO materiales (nombre, descripcion, unidad)
       VALUES ($1, $2, $3) RETURNING id`,
      [nombre.trim(), descripcion?.trim() || null, unidad.trim()]
    );
    const material_id = mat.rows[0].id;

    await client.query(
      `INSERT INTO inventario (material_id, stock_actual, stock_minimo)
       VALUES ($1, $2, $3)`,
      [material_id, Number(stock_actual), Number(stock_minimo)]
    );

    if (Number(stock_actual) > 0) {
      await client.query(
        `INSERT INTO movimientos_inventario (material_id, cantidad, tipo, fecha)
         VALUES ($1, $2, 'entrada', NOW())`,
        [material_id, Number(stock_actual)]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ msg: 'Material creado correctamente', material_id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear material:', err);
    res.status(500).json({ msg: 'Error al crear material' });
  } finally {
    client.release();
  }
};

// ── 4. EDITAR MATERIAL ───────────────────────────────────────────────────────
exports.editarMaterial = async (req, res) => {
  const client = await pool.connect();
  const { id } = req.params;
  try {
    const { nombre, descripcion, unidad, stock_minimo } = req.body;

    await client.query('BEGIN');

    const inv = await client.query(`SELECT material_id FROM inventario WHERE id = $1`, [id]);
    if (inv.rowCount === 0) return res.status(404).json({ msg: 'Registro no encontrado' });
    const material_id = inv.rows[0].material_id;

    await client.query(
      `UPDATE materiales SET
         nombre      = COALESCE($1, nombre),
         descripcion = COALESCE($2, descripcion),
         unidad      = COALESCE($3, unidad)
       WHERE id = $4`,
      [nombre?.trim() || null, descripcion?.trim() ?? null, unidad?.trim() || null, material_id]
    );

    if (stock_minimo !== undefined) {
      await client.query(
        `UPDATE inventario SET stock_minimo = $1 WHERE id = $2`,
        [Number(stock_minimo), id]
      );
    }

    await client.query('COMMIT');
    res.json({ msg: 'Material actualizado correctamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al editar material:', err);
    res.status(500).json({ msg: 'Error al actualizar material' });
  } finally {
    client.release();
  }
};

// ── 5. REGISTRAR MOVIMIENTO (entrada / salida) ───────────────────────────────
exports.registrarMovimiento = async (req, res) => {
  const client = await pool.connect();
  try {
    const { material_id, cantidad, tipo, orden_id } = req.body;

    if (!material_id || !cantidad || !tipo)
      return res.status(400).json({ msg: 'material_id, cantidad y tipo son requeridos' });
    if (!['entrada', 'salida'].includes(tipo))
      return res.status(400).json({ msg: "tipo debe ser 'entrada' o 'salida'" });
    if (Number(cantidad) <= 0)
      return res.status(400).json({ msg: 'La cantidad debe ser mayor a 0' });

    await client.query('BEGIN');

    if (tipo === 'salida') {
      const stockRes = await client.query(
        `SELECT stock_actual FROM inventario WHERE material_id = $1`, [material_id]
      );
      if (stockRes.rowCount === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ msg: 'Material no encontrado en inventario' });
      }
      if (Number(stockRes.rows[0].stock_actual) < Number(cantidad)) {
        await client.query('ROLLBACK');
        return res.status(400).json({ msg: 'Stock insuficiente para esta salida' });
      }
    }

    const delta = tipo === 'entrada' ? Number(cantidad) : -Number(cantidad);
    await client.query(
      `UPDATE inventario SET stock_actual = stock_actual + $1 WHERE material_id = $2`,
      [delta, material_id]
    );

    const mov = await client.query(
      `INSERT INTO movimientos_inventario (material_id, cantidad, tipo, orden_id, fecha)
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [material_id, Number(cantidad), tipo, orden_id || null]
    );

    await client.query('COMMIT');
    res.status(201).json({
      msg: `${tipo === 'entrada' ? 'Entrada' : 'Salida'} registrada`,
      movimiento: mov.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al registrar movimiento:', err);
    res.status(500).json({ msg: 'Error al registrar movimiento' });
  } finally {
    client.release();
  }
};

// ── 6. HISTORIAL DE MOVIMIENTOS ──────────────────────────────────────────────
exports.historialMovimientos = async (req, res) => {
  const { material_id } = req.query;
  try {
    const result = await pool.query(`
      SELECT
        mv.id,
        m.nombre  AS material,
        m.unidad,
        mv.cantidad,
        mv.tipo,
        mv.orden_id,
        TO_CHAR(mv.fecha, 'YYYY-MM-DD HH24:MI') AS fecha
      FROM movimientos_inventario mv
      JOIN materiales m ON mv.material_id = m.id
      ${material_id ? 'WHERE mv.material_id = $1' : ''}
      ORDER BY mv.fecha DESC
      LIMIT 200
    `, material_id ? [material_id] : []);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).json({ msg: 'Error al obtener historial' });
  }
};

// ── 7. ALERTAS DE STOCK BAJO ─────────────────────────────────────────────────
exports.alertasStock = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        m.id AS material_id,
        m.nombre,
        m.unidad,
        i.stock_actual,
        i.stock_minimo
      FROM inventario i
      JOIN materiales m ON i.material_id = m.id
      WHERE i.stock_actual <= i.stock_minimo
      ORDER BY (i.stock_minimo - i.stock_actual) DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener alertas:', err);
    res.status(500).json({ msg: 'Error al obtener alertas de stock' });
  }
};

// ── 8. ELIMINAR MATERIAL ─────────────────────────────────────────────────────
exports.eliminarMaterial = async (req, res) => {
  const { id } = req.params;
  try {
    const inv = await pool.query(`SELECT material_id FROM inventario WHERE id = $1`, [id]);
    if (inv.rowCount === 0) return res.status(404).json({ msg: 'Registro no encontrado' });
    const material_id = inv.rows[0].material_id;

    const movs = await pool.query(
      `SELECT COUNT(*) FROM movimientos_inventario WHERE material_id = $1`, [material_id]
    );
    if (Number(movs.rows[0].count) > 0) {
      return res.status(400).json({
        msg: 'No se puede eliminar: tiene movimientos registrados.'
      });
    }

    await pool.query(`DELETE FROM inventario WHERE id = $1`, [id]);
    await pool.query(`DELETE FROM materiales WHERE id = $1`, [material_id]);
    res.json({ msg: 'Material eliminado correctamente' });
  } catch (err) {
    console.error('Error al eliminar material:', err);
    res.status(500).json({ msg: 'Error al eliminar material' });
  }
};