const pool = require('../config/db');

// =============================
// 1. LISTAR CLIENTES
// =============================
exports.listarClientes = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        nombre,
        telefono,
        direccion,
        email,
        creado_en
      FROM clientes
      ORDER BY nombre ASC
    `);

    res.status(200).json(result.rows);

  } catch (error) {
    console.error('Error al listar clientes:', error);
    res.status(500).json({
      msg: 'Error al obtener clientes',
      error: error.message
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
       (nombre, telefono, direccion, email, creado_en)
       VALUES ($1,$2,$3,$4,CURRENT_TIMESTAMP)
       RETURNING *`,
      [nombre, telefono, direccion, email]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg:'Error al crear cliente' });
  }
};

// =============================
// 4. ACTUALIZAR CLIENTE
// =============================
exports.actualizarCliente = async (req, res) => {

  const { id } = req.params;
  const { nombre, telefono, direccion, email } = req.body;

  try {
    const result = await pool.query(
      `UPDATE clientes
       SET nombre=$1,
           telefono=$2,
           direccion=$3,
           email=$4
       WHERE id=$5
       RETURNING *`,
      [nombre, telefono, direccion, email, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg:'Cliente no encontrado' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg:'Error al actualizar cliente' });
  }
};

// =============================
// 5. ELIMINAR CLIENTE
// =============================
exports.eliminarCliente = async (req, res) => {

  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM clientes WHERE id=$1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg:'Cliente no encontrado' });
    }

    res.json({ msg:'Cliente eliminado correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ msg:'Error al eliminar cliente' });
  }
};