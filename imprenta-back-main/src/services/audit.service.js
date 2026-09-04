// src/services/audit.service.js
const pool = require('../config/db');

class AuditService {
  /**
   * Registra un evento de auditoría en la base de datos
   */
  async registrar(req, { modulo, accion, entidad_id, descripcion, detalles }) {
    try {
      const user = req?.user || {};
      const ip = req?.headers?.['x-forwarded-for'] || req?.socket?.remoteAddress || req?.ip || null;

      await pool.query(`
        INSERT INTO audit_logs 
          (usuario_id, usuario_nombre, usuario_rol, modulo, accion, entidad_id, descripcion, detalles, ip)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        user.id || null,
        user.nombre || 'Sistema / Anónimo',
        user.rol || 'sistema',
        modulo,
        accion.toUpperCase(),
        entidad_id ? String(entidad_id) : null,
        descripcion,
        detalles ? JSON.stringify(detalles) : null,
        ip ? String(ip).slice(0, 50) : null
      ]);
    } catch (err) {
      console.error('⚠️ Error al registrar log de auditoría:', err.message);
      // No bloqueamos la ejecución principal si la auditoría falla
    }
  }

  /**
   * Consulta los logs con filtros avanzados
   */
  async listarLogs({ usuario_id, modulo, accion, fechaInicio, fechaFin, busqueda, limit = 50, offset = 0 } = {}) {
    let query = `
      SELECT 
        id,
        usuario_id,
        usuario_nombre,
        usuario_rol,
        modulo,
        accion,
        entidad_id,
        descripcion,
        detalles,
        ip,
        TO_CHAR(fecha, 'YYYY-MM-DD HH24:MI:SS') AS fecha
      FROM audit_logs
      WHERE 1=1
    `;
    const params = [];

    if (usuario_id && usuario_id !== 'todos') {
      params.push(usuario_id);
      query += ` AND usuario_id = $${params.length}`;
    }
    if (modulo && modulo !== 'todos') {
      params.push(modulo.toLowerCase());
      query += ` AND LOWER(modulo) = $${params.length}`;
    }
    if (accion && accion !== 'todos') {
      params.push(accion.toUpperCase());
      query += ` AND accion = $${params.length}`;
    }
    if (fechaInicio) {
      params.push(fechaInicio);
      query += ` AND fecha >= $${params.length}`;
    }
    if (fechaFin) {
      params.push(`${fechaFin} 23:59:59`);
      query += ` AND fecha <= $${params.length}`;
    }
    if (busqueda && busqueda.trim()) {
      params.push(`%${busqueda.trim().toLowerCase()}%`);
      query += ` AND (LOWER(descripcion) LIKE $${params.length} OR LOWER(usuario_nombre) LIKE $${params.length} OR LOWER(modulo) LIKE $${params.length})`;
    }

    query += ` ORDER BY fecha DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(Number(limit), Number(offset));

    const res = await pool.query(query, params);

    // Conteo total para paginación
    let countQuery = `SELECT COUNT(*) FROM audit_logs WHERE 1=1`;
    const countParams = params.slice(0, -2);
    // Reconstruir filtros para count
    let cIdx = 0;
    if (usuario_id && usuario_id !== 'todos') { cIdx++; countQuery += ` AND usuario_id = $${cIdx}`; }
    if (modulo && modulo !== 'todos') { cIdx++; countQuery += ` AND LOWER(modulo) = $${cIdx}`; }
    if (accion && accion !== 'todos') { cIdx++; countQuery += ` AND accion = $${cIdx}`; }
    if (fechaInicio) { cIdx++; countQuery += ` AND fecha >= $${cIdx}`; }
    if (fechaFin) { cIdx++; countQuery += ` AND fecha <= $${cIdx}`; }
    if (busqueda && busqueda.trim()) { cIdx++; countQuery += ` AND (LOWER(descripcion) LIKE $${cIdx} OR LOWER(usuario_nombre) LIKE $${cIdx} OR LOWER(modulo) LIKE $${cIdx})`; }

    const countRes = await pool.query(countQuery, countParams);

    return {
      logs: res.rows,
      total: Number(countRes.rows[0].count)
    };
  }

  /**
   * Métricas y estadísticas de auditoría
   */
  async obtenerStats() {
    const [hoyRes, desactRes, moduloRes, accionRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM audit_logs WHERE fecha::date = CURRENT_DATE`),
      pool.query(`SELECT COUNT(*) FROM audit_logs WHERE accion IN ('ELIMINAR', 'DESACTIVAR', 'ANULAR')`),
      pool.query(`
        SELECT modulo, COUNT(*) AS total 
        FROM audit_logs 
        GROUP BY modulo 
        ORDER BY total DESC 
        LIMIT 5
      `),
      pool.query(`
        SELECT accion, COUNT(*) AS total 
        FROM audit_logs 
        GROUP BY accion 
        ORDER BY total DESC
      `),
    ]);

    return {
      accionesHoy: Number(hoyRes.rows[0].count),
      totalBajasOAnulaciones: Number(desactRes.rows[0].count),
      topModulos: moduloRes.rows,
      distribucionAcciones: accionRes.rows
    };
  }
}

module.exports = new AuditService();
