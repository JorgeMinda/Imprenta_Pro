// src/controllers/statsController.js  (reemplaza el existente)
const pool = require('../config/db');

exports.getDashboardStats = async (req, res) => {
  try {
    const [ordenesRes, gananciasRes, cotizacionesRes, clientesRes] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE LOWER(estado) = 'diseno'  OR LOWER(estado) = 'diseño') AS diseno,
          COUNT(*) FILTER (WHERE LOWER(estado) = 'en proceso')  AS en_proceso,
          COUNT(*) FILTER (WHERE LOWER(estado) = 'terminada')   AS terminadas,
          COUNT(*) FILTER (WHERE LOWER(estado) = 'entregada')   AS entregadas
        FROM ordenes_trabajo
      `),
      pool.query(`
        SELECT COALESCE(SUM(c.total), 0) AS ganancias
        FROM ordenes_trabajo ot
        JOIN cotizaciones c ON ot.cotizacion_id = c.id
        WHERE LOWER(ot.estado) = 'entregada'
      `),
      // Ventas mensuales ultimos 6 meses
      pool.query(`
        SELECT
          TO_CHAR(fecha, 'Mon') AS mes,
          EXTRACT(MONTH FROM fecha) AS mes_num,
          EXTRACT(YEAR FROM fecha) AS anio,
          COUNT(*) AS total_cotizaciones,
          COALESCE(SUM(total), 0) AS total_ventas
        FROM cotizaciones
        WHERE fecha >= NOW() - INTERVAL '6 months'
          AND LOWER(estado) IN ('aprobada', 'aprobado')
        GROUP BY mes, mes_num, anio
        ORDER BY anio, mes_num
      `),
      pool.query(`SELECT COUNT(*) AS total FROM clientes`),
    ]);

    const o = ordenesRes.rows[0];
    const g = gananciasRes.rows[0];

    res.json({
      // KPIs
      diseno:          Number(o.diseno),
      en_proceso:      Number(o.en_proceso),
      terminadas:      Number(o.terminadas),
      entregadas:      Number(o.entregadas),
      ganancias:       Number(g.ganancias),
      total_clientes:  Number(clientesRes.rows[0].total),
      // Alias legacy
      pendientes:      Number(o.diseno),
      // Datos para gráficos de Reportes
      ventas_mensuales: cotizacionesRes.rows.map(r => ({
        mes:        r.mes,
        ventas:     Number(r.total_ventas),
        cotizaciones: Number(r.total_cotizaciones),
      })),
    });

  } catch (err) {
    console.error('Error en stats/dashboard:', err);
    res.status(500).json({ msg: 'Error al obtener estadísticas' });
  }
};

// Reportes avanzados
exports.getReportes = async (req, res) => {
  try {
    const [ventasRes, estadosRes, topProductosRes, ingresosMensualesRes] = await Promise.all([
      // Ventas últimos 6 meses
      pool.query(`
        SELECT
          TO_CHAR(fecha, 'Mon YYYY') AS mes,
          EXTRACT(MONTH FROM fecha) AS mes_num,
          EXTRACT(YEAR FROM fecha) AS anio,
          COALESCE(SUM(total), 0)  AS ventas,
          COUNT(*)                  AS cotizaciones
        FROM cotizaciones
        WHERE fecha >= NOW() - INTERVAL '6 months'
        GROUP BY mes, mes_num, anio
        ORDER BY anio, mes_num
      `),
      // Distribución de estados de órdenes
      pool.query(`
        SELECT
          INITCAP(estado) AS nombre,
          COUNT(*)        AS valor
        FROM ordenes_trabajo
        GROUP BY estado
        ORDER BY valor DESC
      `),
      // Top 5 productos más cotizados
      pool.query(`
        SELECT
          p.nombre AS producto,
          SUM(dc.cantidad)   AS cantidad_total,
          SUM(dc.subtotal)   AS ingresos
        FROM detalle_cotizacion dc
        JOIN productos p ON dc.producto_id = p.id
        GROUP BY p.nombre
        ORDER BY ingresos DESC
        LIMIT 5
      `),
      // Ingresos mensuales (solo entregadas)
      pool.query(`
        SELECT
          TO_CHAR(ot.fecha_inicio, 'Mon YYYY') AS mes,
          EXTRACT(MONTH FROM ot.fecha_inicio) AS mes_num,
          EXTRACT(YEAR FROM ot.fecha_inicio) AS anio,
          COALESCE(SUM(c.total), 0) AS ingresos
        FROM ordenes_trabajo ot
        JOIN cotizaciones c ON ot.cotizacion_id = c.id
        WHERE LOWER(ot.estado) = 'entregada'
          AND ot.fecha_inicio >= NOW() - INTERVAL '6 months'
        GROUP BY mes, mes_num, anio
        ORDER BY anio, mes_num
      `),
    ]);

    res.json({
      ventas_mensuales:    ventasRes.rows.map(r => ({
        mes:          r.mes,
        ventas:       Number(r.ventas),
        cotizaciones: Number(r.cotizaciones),
      })),
      estados_ordenes:     estadosRes.rows.map(r => ({
        nombre: r.nombre,
        valor:  Number(r.valor),
      })),
      top_productos:       topProductosRes.rows.map(r => ({
        producto:  r.producto,
        cantidad:  Number(r.cantidad_total),
        ingresos:  Number(r.ingresos),
      })),
      ingresos_mensuales:  ingresosMensualesRes.rows.map(r => ({
        mes:      r.mes,
        ventas:   Number(r.ingresos),
      })),
    });

  } catch (err) {
    console.error('Error en reportes:', err);
    res.status(500).json({ msg: 'Error al obtener reportes' });
  }
};