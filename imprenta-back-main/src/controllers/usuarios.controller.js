// src/controllers/usuarios.controller.js
const pool   = require('../config/db');
const bcrypt = require('bcryptjs');

exports.listar = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, nombre, email, rol, cedula,
             TO_CHAR(created_at, 'YYYY-MM-DD') AS creado_en
      FROM usuarios ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ msg: 'Error al obtener usuarios' });
  }
};

exports.crear = async (req, res) => {
  try {
    const { nombre, email, password, rol = 'empleado', cedula } = req.body;
    if (!nombre?.trim()) return res.status(400).json({ msg: 'El nombre es requerido' });
    if (!email?.trim())  return res.status(400).json({ msg: 'El email es requerido' });
    if (!password || password.length < 6)
      return res.status(400).json({ msg: 'La contrasena debe tener al menos 6 caracteres' });
    if (!['admin','vendedor','empleado','secretaria'].includes(rol))
      return res.status(400).json({ msg: 'Rol invalido' });

    const existe = await pool.query(`SELECT id FROM usuarios WHERE email = $1`, [email.trim()]);
    if (existe.rowCount > 0) return res.status(409).json({ msg: 'Ya existe un usuario con ese email' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol, cedula)
       VALUES ($1,$2,$3,$4,$5) RETURNING id, nombre, email, rol`,
      [nombre.trim(), email.trim().toLowerCase(), hash, rol, cedula || null]
    );
    res.status(201).json({ msg: 'Usuario creado correctamente', usuario: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al crear usuario' });
  }
};

exports.editar = async (req, res) => {
  const { id } = req.params;
  try {
    const { nombre, email, rol, cedula } = req.body;
    if (rol && !['admin','vendedor','empleado','secretaria'].includes(rol))
      return res.status(400).json({ msg: 'Rol invalido' });

    if (req.user.id === Number(id) && rol && rol !== 'admin') {
      const admins = await pool.query(`SELECT COUNT(*) FROM usuarios WHERE rol='admin'`);
      if (Number(admins.rows[0].count) <= 1)
        return res.status(400).json({ msg: 'No puedes cambiar el rol del unico administrador' });
    }

    await pool.query(
      `UPDATE usuarios SET
         nombre = COALESCE($1, nombre),
         email  = COALESCE($2, email),
         rol    = COALESCE($3, rol),
         cedula = COALESCE($4, cedula)
       WHERE id = $5`,
      [nombre?.trim()||null, email?.trim().toLowerCase()||null, rol||null, cedula||null, id]
    );
    res.json({ msg: 'Usuario actualizado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al actualizar usuario' });
  }
};

exports.cambiarPassword = async (req, res) => {
  const { id } = req.params;
  const { password_nuevo, password_actual } = req.body;
  try {
    if (!password_nuevo || password_nuevo.length < 6)
      return res.status(400).json({ msg: 'La contrasena debe tener al menos 6 caracteres' });

    const user = await pool.query(`SELECT password FROM usuarios WHERE id=$1`, [id]);
    if (user.rowCount === 0) return res.status(404).json({ msg: 'Usuario no encontrado' });

    if (req.user.id === Number(id)) {
      if (!password_actual) return res.status(400).json({ msg: 'Debes ingresar tu contrasena actual' });
      const ok = await bcrypt.compare(password_actual, user.rows[0].password);
      if (!ok) return res.status(401).json({ msg: 'Contrasena actual incorrecta' });
    }

    const hash = await bcrypt.hash(password_nuevo, 10);
    await pool.query(`UPDATE usuarios SET password=$1 WHERE id=$2`, [hash, id]);
    res.json({ msg: 'Contrasena actualizada correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al cambiar contrasena' });
  }
};

exports.eliminar = async (req, res) => {
  const { id } = req.params;
  try {
    if (req.user.id === Number(id))
      return res.status(400).json({ msg: 'No puedes eliminarte a ti mismo' });

    const target = await pool.query(`SELECT rol FROM usuarios WHERE id=$1`, [id]);
    if (target.rowCount === 0) return res.status(404).json({ msg: 'Usuario no encontrado' });

    if (target.rows[0].rol === 'admin') {
      const admins = await pool.query(`SELECT COUNT(*) FROM usuarios WHERE rol='admin'`);
      if (Number(admins.rows[0].count) <= 1)
        return res.status(400).json({ msg: 'No se puede eliminar el unico administrador' });
    }

    await pool.query(`DELETE FROM usuarios WHERE id=$1`, [id]);
    res.json({ msg: 'Usuario eliminado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Error al eliminar usuario' });
  }
};