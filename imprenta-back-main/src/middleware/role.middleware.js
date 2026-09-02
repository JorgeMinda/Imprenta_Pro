module.exports = (...rolesPermitidos) => {
  return (req, res, next) => {

    if (!req.user)
      return res.status(401).json({
        msg: 'No autenticado'
      });

    if (!rolesPermitidos.includes(req.user.rol))
      return res.status(403).json({
        msg: 'No tienes permisos'
      });

    next();
  };
};