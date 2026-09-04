// src/controllers/audit.controller.js
const auditService = require('../services/audit.service');

exports.listarLogs = async (req, res) => {
  try {
    const filtros = {
      usuario_id: req.query.usuario_id,
      modulo:     req.query.modulo,
      accion:     req.query.accion,
      fechaInicio:req.query.fechaInicio,
      fechaFin:   req.query.fechaFin,
      busqueda:   req.query.busqueda,
      limit:      req.query.limit || 50,
      offset:     req.query.offset || 0,
    };
    const data = await auditService.listarLogs(filtros);
    res.json(data);
  } catch (err) {
    console.error('Error al listar logs de auditoría:', err);
    res.status(500).json({ msg: 'Error al obtener registros de auditoría' });
  }
};

exports.obtenerStats = async (_req, res) => {
  try {
    const stats = await auditService.obtenerStats();
    res.json(stats);
  } catch (err) {
    console.error('Error al obtener estadísticas de auditoría:', err);
    res.status(500).json({ msg: 'Error al obtener estadísticas de auditoría' });
  }
};
