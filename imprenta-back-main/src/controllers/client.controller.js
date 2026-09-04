// src/controllers/client.controller.js
const pool = require('../config/db');
const auditService = require('../services/audit.service');

// =============================
// 1. LISTAR CLIENTES
// =============================
exports.listarClientes = async (req, res) => {
  try {
    const incluirInactivos = req.query.incluirInactivos === 'true' || req.user?.rol === 'admin';
    const whereClause = incluirInactivos ? '' : 'WHERE activo = true';

    const result = await pool.query(`
      SELECT
        id,
        nombre,
        telefono,
        direccion,
        email,
        activo,
        creado_en
      FROM clientes
      ${whereClause}
      ORDER BY nombre ASC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({
      msg: 'Error al obtener clientes',
      error: error.message,
    });
  }
};

// =============================
// 2. OBTENER CLIENTE POR ID
// =============================
exports.getClienteById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM clientes WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg: 'Cliente no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al obtener cliente' });
  }
};

// =============================
// 3. CREAR CLIENTE
// =============================
exports.crearCliente = async (req, res) => {
  const { nombre, telefono, direccion, email } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO clientes
       (nombre, telefono, direccion, email, activo, creado_en)
       VALUES ($1, $2, $3, $4, true, CURRENT_TIMESTAMP)
       RETURNING *`,
      [nombre, telefono, direccion, email]
    );

    const cliente = result.rows[0];

    // Registrar en auditoría
    await auditService.registrar(req, {
      modulo: 'clientes',
      accion: 'CREAR',
      entidad_id: cliente.id,
      descripcion: `Nuevo cliente registrado: ${cliente.nombre}`,
      detalles: cliente,
    });

    res.status(201).json(cliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al crear cliente' });
  }
};

// =============================
// 4. ACTUALIZAR CLIENTE
// =============================
exports.actualizarCliente = async (req, res) => {
  const { id } = req.params;
  const { nombre, telefono, direccion, email, activo } = req.body;

  try {
    const result = await pool.query(
      `UPDATE clientes
       SET nombre = COALESCE($1, nombre),
           telefono = COALESCE($2, telefono),
           direccion = COALESCE($3, direccion),
           email = COALESCE($4, email),
           activo = COALESCE($5, activo)
       WHERE id = $6
       RETURNING *`,
      [nombre, telefono, direccion, email, activo, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg: 'Cliente no encontrado' });
    }

    const cliente = result.rows[0];

    // Registrar en auditoría
    await auditService.registrar(req, {
      modulo: 'clientes',
      accion: 'EDITAR',
      entidad_id: cliente.id,
      descripcion: `Cliente actualizado: ${cliente.nombre}`,
      detalles: cliente,
    });

    res.json(cliente);
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al actualizar cliente' });
  }
};

// =============================
// 5. ELIMINAR / DESACTIVAR CLIENTE (Soft Delete vs Hard Delete)
// =============================
exports.eliminarCliente = async (req, res) => {
  const { id } = req.params;
  const esAdmin = req.user?.rol === 'admin';
  const esHardDelete = esAdmin && req.query.hard === 'true';

  try {
    const prev = await pool.query(`SELECT * FROM clientes WHERE id = $1`, [id]);
    if (prev.rowCount === 0) {
      return res.status(404).json({ msg: 'Cliente no encontrado' });
    }
    const cliente = prev.rows[0];

    if (esHardDelete) {
      // Borrado físico exclusivo de Admin
      await pool.query(`DELETE FROM clientes WHERE id = $1`, [id]);

      await auditService.registrar(req, {
        modulo: 'clientes',
        accion: 'ELIMINAR',
        entidad_id: id,
        descripcion: `Cliente eliminado definitivamente de la base de datos: ${cliente.nombre}`,
        detalles: cliente,
      });

      return res.json({ msg: 'Cliente eliminado permanentemente' });
    } else {
      // Borrado lógico (Soft Delete): pasa a activo = false
      await pool.query(`UPDATE clientes SET activo = false WHERE id = $1`, [id]);

      await auditService.registrar(req, {
        modulo: 'clientes',
        accion: 'DESACTIVAR',
        entidad_id: id,
        descripcion: `Cliente desactivado (borrado lógico): ${cliente.nombre}`,
        detalles: { id, nombre: cliente.nombre, activo_anterior: cliente.activo, activo_nuevo: false },
      });

      return res.json({ msg: 'Cliente desactivado correctamente (borrado lógico)', cliente: { ...cliente, activo: false } });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ msg: 'Error al procesar la baja del cliente' });
  }
};