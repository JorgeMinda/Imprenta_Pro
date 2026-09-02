const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
  const { nombre, email, password, rol,cedula } = req.body;

  const hash = await bcrypt.hash(password, 10);

  const user = await pool.query(
    `INSERT INTO usuarios(nombre,email,password,rol,cedula)

     VALUES($1,$2,$3,$4,$5)
     RETURNING id,nombre,email,rol,cedula`,
    [nombre, email, hash, rol,cedula]
  );

  res.json(user.rows[0]);
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    `SELECT * FROM usuarios WHERE email=$1`,
    [email]
  );

  if (!result.rows.length)
    return res.status(404).json({ msg: 'Usuario no existe' });

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);

  if (!valid)
    return res.status(401).json({ msg: 'Password incorrecto' });

  const token = jwt.sign(
    { id: user.id, 
      rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      nombre: user.nombre,
      rol: user.rol,
    },
  });
};