// src/controllers/inventario.controller.js
const pool = require('../config/db');
const auditService = require('../services/audit.service');

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
      WHERE COALESCE(i.activo, true) = true AND COALESCE(m.activo, true) = true
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
      `SELECT id, nombre, descripcion, unidad FROM materiales WHERE COALESCE(activo, true) = true ORDER BY nombre ASC`
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
      `INSERT INTO materiales (nombre, descripcion, unidad, activo)
       VALUES ($1, $2, $3, true) RETURNING id`,
      [nombre.trim(), descripcion?.trim() || null, unidad.trim()]
    );
    const material_id = mat.rows[0].id;

    const invRes = await client.query(
      `INSERT INTO inventario (material_id, stock_actual, stock_minimo, activo)
       VALUES ($1, $2, $3, true) RETURNING id`,
      [material_id, Number(stock_actual), Number(stock_minimo)]
    );
    const inventario_id = invRes.rows[0].id;

    if (Number(stock_actual) > 0) {
      await client.query(
        `INSERT INTO movimientos_inventario (material_id, cantidad, tipo, fecha)
         VALUES ($1, $2, 'entrada', NOW())`,
        [material_id, Number(stock_actual)]
      );
    }

    await client.query('COMMIT');

    await auditService.registrar(req, {
      modulo: 'inventario',
      accion: 'CREAR',
      entidad_id: inventario_id,
      descripcion: `Material "${nombre.trim()}" creado con stock inicial de ${Number(stock_actual)} ${unidad.trim()}`,
      detalles: { inventario_id, material_id, nombre: nombre.trim(), unidad: unidad.trim(), stock_actual: Number(stock_actual), stock_minimo: Number(stock_minimo) },
    });

    res.status(201).json({ msg: 'Material creado correctamente', material_id, inventario_id });
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
    if (inv.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ msg: 'Registro no encontrado' });
    }
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

    await auditService.registrar(req, {
      modulo: 'inventario',
      accion: 'EDITAR',
      entidad_id: id,
      descripcion: `Material #${material_id} ("${nombre?.trim() || 'Material'}") actualizado`,
      detalles: { inventario_id: id, material_id, nombre, unidad, stock_minimo },
    });

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

    const stockRes = await client.query(
      `SELECT i.stock_actual, m.nombre, m.unidad 
       FROM inventario i 
       JOIN materiales m ON m.id = i.material_id 
       WHERE i.material_id = $1`, [material_id]
    );
    if (stockRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ msg: 'Material no encontrado en inventario' });
    }

    const { stock_actual, nombre, unidad } = stockRes.rows[0];

    if (tipo === 'salida' && Number(stock_actual) < Number(cantidad)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ msg: 'Stock insuficiente para esta salida' });
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

    await auditService.registrar(req, {
      modulo: 'inventario',
      accion: tipo === 'entrada' ? 'ENTRADA_STOCK' : 'SALIDA_STOCK',
      entidad_id: material_id,
      descripcion: `Movimiento de ${tipo}: ${cantidad} ${unidad} en "${nombre}"`,
      detalles: { material_id, nombre, cantidad: Number(cantidad), tipo, orden_id, stock_anterior: Number(stock_actual), stock_nuevo: Number(stock_actual) + delta },
    });

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
      WHERE COALESCE(i.activo, true) = true 
        AND COALESCE(m.activo, true) = true
        AND i.stock_actual <= i.stock_minimo
      ORDER BY (i.stock_minimo - i.stock_actual) DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener alertas:', err);
    res.status(500).json({ msg: 'Error al obtener alertas de stock' });
  }
};

// ── 8. ELIMINAR / DESACTIVAR MATERIAL (SOFT DELETE PARA SECRETARIA / VENDEDOR) ──
exports.eliminarMaterial = async (req, res) => {
  const { id } = req.params;
  const userRole = req.user?.rol;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inv = await client.query(`
      SELECT i.id, i.material_id, m.nombre 
      FROM inventario i 
      JOIN materiales m ON i.material_id = m.id 
      WHERE i.id = $1
    `, [id]);
    
    if (inv.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ msg: 'Registro no encontrado' });
    }
    const { material_id, nombre } = inv.rows[0];

    const movs = await client.query(
      `SELECT COUNT(*) FROM movimientos_inventario WHERE material_id = $1`, [material_id]
    );
    const hasMovements = Number(movs.rows[0].count) > 0;

    // Si es secretaria, vendedor o si el material posee historial de movimientos: Soft Delete
    if (userRole !== 'admin' || hasMovements) {
      await client.query(`UPDATE inventario SET activo = false WHERE id = $1`, [id]);
      await client.query(`UPDATE materiales SET activo = false WHERE id = $1`, [material_id]);
      await client.query('COMMIT');

      await auditService.registrar(req, {
        modulo: 'inventario',
        accion: 'DESACTIVAR',
        entidad_id: id,
        descripcion: `Material "${nombre}" (ID: ${material_id}) dado de baja (Soft Delete) por usuario rol ${userRole}`,
        detalles: { inventario_id: id, material_id, nombre, soft_delete: true, motivo: hasMovements ? 'Posee movimientos registrados' : 'Baja solicitada' },
      });

      return res.json({ msg: 'Material desactivado correctamente (Soft Delete)' });
    }

    // Si es administrador y no tiene movimientos: borrado definitivo
    await client.query(`DELETE FROM inventario WHERE id = $1`, [id]);
    await client.query(`DELETE FROM materiales WHERE id = $1`, [material_id]);
    await client.query('COMMIT');

    await auditService.registrar(req, {
      modulo: 'inventario',
      accion: 'ELIMINAR',
      entidad_id: id,
      descripcion: `Material "${nombre}" (ID: ${material_id}) eliminado definitivamente de la base de datos por el administrador`,
      detalles: { inventario_id: id, material_id, nombre, hard_delete: true },
    });

    res.json({ msg: 'Material eliminado definitivamente' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al eliminar/desactivar material:', err);
    res.status(500).json({ msg: 'Error al procesar la baja del material' });
  } finally {
    client.release();
  }
};