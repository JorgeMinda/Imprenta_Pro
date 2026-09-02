const pool = require('../config/db');

// --- 1. CREAR ORDEN DE TRABAJO ---
exports.createOrder = async (req, res) => {
  // Extraemos los datos que envíe el cliente (frontend)
  const { 
    cotizacion_id, 
    empleado_id, 
    estado, 
    fecha_inicio, 
    fecha_entrega, 
    observaciones 
  } = req.body;

  // Nota: Si el empleado_id debe ser el del usuario logueado, 
  // podrías usar: const empleado_id = req.user.id;

  try {
    const result = await pool.query(
      `INSERT INTO ordenes_trabajo 
       (cotizacion_id, empleado_id, estado, fecha_inicio, fecha_entrega, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [cotizacion_id, empleado_id, estado, fecha_inicio, fecha_entrega, observaciones]
    );

    res.status(201).json({ 
      msg: 'Orden de trabajo creada ✅', 
      orden: result.rows[0] 
    });
  } catch (error) {
    console.error("Error al crear la orden de trabajo:", error);
    res.status(500).json({ error: "Error interno del servidor al crear la orden" });
  }
};

// --- 2. OBTENER TODAS LAS ÓRDENES ---
exports.getAll = async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM ordenes_trabajo`);
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener las órdenes:", error);
    res.status(500).json({ error: "Error interno del servidor al obtener las órdenes" });
  }
};

// --- 3. ACTUALIZAR UNA ORDEN ---
exports.update = async (req, res) => {
  const { id } = req.params; 
  const { 
   cotizacion_id, 
    empleado_id, 
    estado, 
    fecha_inicio, 
    fecha_entrega, 
    observaciones 
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE ordenes_trabajo 
       SET cotizacion_id = $1, empleado_id = $2, estado = $3, fecha_inicio = $4, fecha_entrega = $5, observaciones = $6 
       WHERE id = $7 
       RETURNING *`,
      [cotizacion_id, empleado_id, estado, fecha_inicio, fecha_entrega, observaciones, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Orden de trabajo no encontrada" });
    }

    res.json({
      msg: 'Orden actualizada correctamente',
      orden: result.rows[0]
    });
  } catch (error) {
    console.error("Error al actualizar la orden:", error);
    res.status(500).json({ error: "Error interno del servidor al actualizar" });
  }
};

// --- 4. ELIMINAR UNA ORDEN ---
exports.remove = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM ordenes_trabajo 
       WHERE id = $1 
       RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Orden de trabajo no encontrada" });
    }

    res.json({ 
      msg: "Orden eliminada correctamente", 
      orden: result.rows[0] 
    });
  } catch (error) {
    console.error("Error al eliminar la orden:", error);
    res.status(500).json({ error: "Error interno del servidor al eliminar" });
  }
  };
  exports.listarOrdenes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ot.id,
        ot.cotizacion_id,
        c.cliente_id,
        cl.nombre AS cliente,
        ot.estado,
        ot.fecha_inicio,
        ot.fecha_entrega,
        ot.observaciones
      FROM ordenes_trabajo ot
      JOIN cotizaciones c ON ot.cotizacion_id = c.id
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      ORDER BY ot.fecha_inicio DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al listar órdenes' });
  }
};
// --- 5. ACTUALIZAR SÓLO EL ESTADO ---
exports.actualizarEstado = async (req, res) => {
  const { id } = req.params; 
  const { estado } = req.body;

  try {
    const result = await pool.query(
      `UPDATE ordenes_trabajo 
       SET estado = $1 
       WHERE id = $2 
       RETURNING *`,
      [estado, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg: "Orden de trabajo no encontrada" });
    }

    res.json({
      msg: 'Estado actualizado correctamente',
      orden: result.rows[0]
    });
  } catch (error) {
    console.error("Error al actualizar el estado:", error);
    res.status(500).json({ msg: "Error al actualizar el estado de la orden" });
  }
};