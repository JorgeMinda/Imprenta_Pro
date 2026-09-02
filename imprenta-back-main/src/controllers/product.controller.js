const pool = require('../config/db');

// 1. LISTAR PRODUCTOS
exports.listarProductos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        nombre,
        descripcion,
        precio_base,
        stock,
        creado_en
      FROM productos
      ORDER BY nombre ASC
    `);

    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error al listar productos:', error);
    res.status(500).json({
      msg: 'Error al obtener productos',
      error: error.message
    });
  }
};

// 2. OBTENER PRODUCTO POR ID
exports.getProductoById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM productos WHERE id = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg: 'Producto no encontrado' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ msg: 'Error al obtener el producto' });
  }
};

// 3. CREAR PRODUCTO
exports.crearProducto = async (req, res) => {
  const { nombre, descripcion, precio_base } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO productos (nombre, descripcion, precio_base, creado_en)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING *`,
      [nombre, descripcion, precio_base]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ msg: 'Error al crear el producto' });
  }
};

// 4. ACTUALIZAR PRODUCTO
exports.actualizarProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio_base } = req.body;

  try {
    const result = await pool.query(
      `UPDATE productos
       SET nombre = $1,
           descripcion = $2,
           precio_base = $3
       WHERE id = $4
       RETURNING *`,
      [nombre, descripcion, precio_base, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg: 'Producto no encontrado' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ msg: 'Error al actualizar el producto' });
  }
};

// 5. ELIMINAR PRODUCTO
exports.eliminarProducto = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM productos WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ msg: 'Producto no encontrado' });
    }

    res.status(200).json({ msg: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ msg: 'Error al eliminar el producto' });
  }
};