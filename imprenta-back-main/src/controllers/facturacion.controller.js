const PDFDocument = require('pdfkit');
const pool = require('../config/db');

async function generarNumero(client) {
  const res = await client.query(`SELECT COUNT(*) FROM facturas`);
  const n   = Number(res.rows[0].count) + 1;
  return `FAC-${String(n).padStart(6, '0')}`;
}

// ── 1. LISTAR ─────────────────────────────────────────────────────────────
exports.listar = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        f.id,
        f.numero,
        f.orden_id,
        f.cotizacion_id,
        f.subtotal,
        f.impuesto_porcentaje,
        f.impuesto_valor,
        f.total,
        f.estado,
        f.observaciones,
        TO_CHAR(f.fecha_emision, 'YYYY-MM-DD') AS fecha_emision,
        TO_CHAR(f.fecha,        'YYYY-MM-DD') AS fecha,
        c.nombre AS cliente
      FROM facturas f
      LEFT JOIN clientes     c  ON f.cliente_id    = c.id
      LEFT JOIN cotizaciones co ON f.cotizacion_id = co.id
      ORDER BY f.fecha DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al listar facturas:', err);
    res.status(500).json({ msg: 'Error al obtener facturas' });
  }
};

// ── 2. CREAR desde cotización ─────────────────────────────────────────────
exports.crear = async (req, res) => {
  const client = await pool.connect();
  try {
    const { cotizacion_id, impuesto_porcentaje = 15, observaciones } = req.body;
    if (!cotizacion_id)
      return res.status(400).json({ msg: 'cotizacion_id es requerido' });

    await client.query('BEGIN');

    const cotRes = await client.query(`
      SELECT co.id, co.total, co.cliente_id, co.estado
      FROM cotizaciones co WHERE co.id = $1
    `, [cotizacion_id]);

    if (cotRes.rowCount === 0)
      return res.status(404).json({ msg: 'Cotización no encontrada' });

    const cot = cotRes.rows[0];
    if (cot.estado !== 'aprobada')
      return res.status(400).json({ msg: 'Solo se pueden facturar cotizaciones aprobadas' });

    // Verificar duplicado
    const dup = await client.query(
      `SELECT id FROM facturas WHERE cotizacion_id = $1 AND estado != 'anulada'`,
      [cotizacion_id]
    );
    if (dup.rowCount > 0)
      return res.status(400).json({ msg: 'Esta cotización ya tiene una factura activa' });

    const subtotal       = Number(cot.total);
    const impuesto_valor = subtotal * (Number(impuesto_porcentaje) / 100);
    const total          = subtotal + impuesto_valor;
    const numero         = await generarNumero(client);

    const insert = await client.query(`
      INSERT INTO facturas
        (numero, cotizacion_id, cliente_id, subtotal, impuesto_porcentaje,
         impuesto_valor, total, estado, observaciones, fecha_emision)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'pendiente',$8,CURRENT_DATE)
      RETURNING *
    `, [numero, cotizacion_id, cot.cliente_id, subtotal,
        impuesto_porcentaje, impuesto_valor, total, observaciones || null]);

    await client.query('COMMIT');
    res.status(201).json({ msg: 'Factura creada', factura: insert.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error al crear factura:', err);
    res.status(500).json({ msg: 'Error al crear factura' });
  } finally {
    client.release();
  }
};

// ── 3. CAMBIAR ESTADO ─────────────────────────────────────────────────────
exports.cambiarEstado = async (req, res) => {
  const { id }     = req.params;
  const { estado } = req.body;

  if (!['pagada','anulada'].includes(estado))
    return res.status(400).json({ msg: "estado debe ser 'pagada' o 'anulada'" });

  try {
    const result = await pool.query(
      `UPDATE facturas SET estado = $1 WHERE id = $2 RETURNING *`,
      [estado, id]
    );
    if (result.rowCount === 0)
      return res.status(404).json({ msg: 'Factura no encontrada' });
    res.json({ msg: `Factura marcada como ${estado}`, factura: result.rows[0] });
  } catch (err) {
    console.error('Error al cambiar estado:', err);
    res.status(500).json({ msg: 'Error al actualizar factura' });
  }
};

// ── 4. ELIMINAR (solo anuladas) ───────────────────────────────────────────
exports.eliminar = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `DELETE FROM facturas WHERE id = $1 AND estado = 'anulada' RETURNING id`,
      [id]
    );
    if (result.rowCount === 0)
      return res.status(400).json({ msg: 'Solo se pueden eliminar facturas anuladas' });
    res.json({ msg: 'Factura eliminada' });
  } catch (err) {
    console.error('Error al eliminar factura:', err);
    res.status(500).json({ msg: 'Error al eliminar factura' });
  }
};

// ── 5. GENERAR PDF DE FACTURA ─────────────────────────────────────────────
exports.generarPDF = async (req, res) => {
  const { id } = req.params;

  try {
    const facturaRes = await pool.query(
      `SELECT
          f.id,
          f.numero,
          f.cotizacion_id,
          f.subtotal,
          f.impuesto_porcentaje,
          f.impuesto_valor,
          f.total,
          f.estado,
          f.observaciones,
          TO_CHAR(COALESCE(f.fecha_emision, f.fecha, CURRENT_DATE), 'YYYY-MM-DD') AS fecha_emision,
          cl.nombre    AS cliente,
          cl.direccion AS cliente_direccion,
          cl.email     AS cliente_email,
          cl.telefono  AS cliente_telefono
       FROM facturas f
       LEFT JOIN clientes cl ON f.cliente_id = cl.id
       WHERE f.id = $1`,
      [id]
    );

    if (facturaRes.rowCount === 0) {
      return res.status(404).json({ msg: 'Factura no encontrada' });
    }

    const factura = facturaRes.rows[0];

    // Obtener detalles de productos si tiene cotización asociada
    let detalle = [];
    if (factura.cotizacion_id) {
      const detalleRes = await pool.query(
        `SELECT
            p.nombre AS producto,
            dc.cantidad,
            dc.precio_unitario,
            dc.subtotal
         FROM detalle_cotizacion dc
         JOIN productos p ON dc.producto_id = p.id
         WHERE dc.cotizacion_id = $1`,
        [factura.cotizacion_id]
      );
      detalle = detalleRes.rows;
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=factura-${factura.numero || factura.id}.pdf`
    );

    doc.pipe(res);

    // Paleta de colores
    const COLOR_PRIMARY   = '#4F46E5'; // Indigo-600
    const COLOR_SECONDARY = '#6B7280'; // Gray-500
    const COLOR_DARK      = '#111827'; // Gray-900
    const COLOR_LIGHT     = '#F9FAFB'; // Gray-50
    const COLOR_BORDER    = '#E5E7EB'; // Gray-200
    const COLOR_SUCCESS   = '#10B981'; // Emerald-500
    const COLOR_WARNING   = '#F59E0B'; // Amber-500
    const COLOR_DANGER    = '#EF4444'; // Red-500

    // Encabezado superior con fondo
    doc.rect(0, 0, doc.page.width, 105).fill(COLOR_PRIMARY);

    doc
      .fillColor('#FFFFFF')
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('IMPRENTA PRO', 50, 26);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('rgba(255,255,255,0.8)')
      .text('Sistema de Gestión e Impresión Gráfica', 50, 54);

    // Número de Factura y Fecha (a la derecha)
    doc
      .fillColor('#FFFFFF')
      .fontSize(15)
      .font('Helvetica-Bold')
      .text(`FACTURA ${factura.numero}`, 0, 26, { align: 'right', width: doc.page.width - 50 });

    const fechaFormat = factura.fecha_emision || new Date().toISOString().split('T')[0];
    doc
      .fillColor('rgba(255,255,255,0.85)')
      .fontSize(9)
      .font('Helvetica')
      .text(`Fecha de emisión: ${fechaFormat}`, 0, 50, { align: 'right', width: doc.page.width - 50 });

    // Badge de estado en la cabecera
    const estadoUpper = (factura.estado || 'PENDIENTE').toUpperCase();
    const estadoBg = estadoUpper === 'PAGADA' ? COLOR_SUCCESS : (estadoUpper === 'ANULADA' ? COLOR_DANGER : COLOR_WARNING);
    const badgeW = 100;
    const badgeX = doc.page.width - 50 - badgeW;
    doc.rect(badgeX, 70, badgeW, 20).fill(estadoBg);
    doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold').text(`ESTADO: ${estadoUpper}`, badgeX, 75, {
      width: badgeW,
      align: 'center',
    });

    // Separador
    doc.moveDown(3.5);

    // Bloque cliente / detalles
    const startY   = 125;
    const colLeft  = 50;
    const colRight = 310;
    const boxH     = 95;

    // Caja Cliente
    doc
      .rect(colLeft, startY, 230, boxH)
      .fillAndStroke(COLOR_LIGHT, COLOR_BORDER);

    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('FACTURAR A', colLeft + 12, startY + 10);

    doc
      .fillColor(COLOR_DARK)
      .fontSize(11)
      .font('Helvetica-Bold')
      .text(factura.cliente || 'Consumidor Final', colLeft + 12, startY + 24, { width: 206 });

    doc
      .fillColor(COLOR_SECONDARY)
      .fontSize(9)
      .font('Helvetica')
      .text(factura.cliente_direccion || 'Sin dirección registrada', colLeft + 12, startY + 42, { width: 206 })
      .text(factura.cliente_email     || 'Sin email registrado',     colLeft + 12, startY + 56, { width: 206 })
      .text(factura.cliente_telefono  || 'Sin teléfono registrado',  colLeft + 12, startY + 70, { width: 206 });

    // Caja Datos Factura
    doc
      .rect(colRight, startY, 230, boxH)
      .fillAndStroke(COLOR_LIGHT, COLOR_BORDER);

    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('INFORMACIÓN DE FACTURA', colRight + 12, startY + 10);

    const infoRows = [
      ['N° Factura',    factura.numero],
      ['Cotización',   factura.cotizacion_id ? `#${factura.cotizacion_id}` : '—'],
      ['Fecha emisión', fechaFormat],
      ['Estado Pago',   estadoUpper],
    ];

    infoRows.forEach(([k, v], i) => {
      const y = startY + 26 + i * 15;
      doc.fillColor(COLOR_SECONDARY).fontSize(9).font('Helvetica').text(k, colRight + 12, y);
      doc.fillColor(COLOR_DARK).font('Helvetica-Bold').text(v, colRight + 110, y, { width: 110 });
    });

    // Tabla de productos
    const tableTop   = startY + boxH + 20;
    const tableWidth = doc.page.width - 100;

    doc.rect(colLeft, tableTop, tableWidth, 22).fill(COLOR_PRIMARY);

    const cols = [
      { label: 'Descripción / Producto', x: colLeft + 8,   w: 220 },
      { label: 'Cantidad',                x: colLeft + 235, w: 60,  align: 'center' },
      { label: 'Precio Unit.',           x: colLeft + 305, w: 80,  align: 'right'  },
      { label: 'Subtotal',               x: colLeft + 395, w: 90,  align: 'right'  },
    ];

    cols.forEach(c => {
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold').text(c.label, c.x, tableTop + 6, {
        width: c.w,
        align: c.align || 'left',
      });
    });

    let rowY = tableTop + 22;
    if (detalle.length === 0) {
      doc
        .rect(colLeft, rowY, tableWidth, 26)
        .fillAndStroke('#FFFFFF', COLOR_BORDER);
      doc
        .fillColor(COLOR_SECONDARY)
        .fontSize(9)
        .font('Helvetica')
        .text('Servicios de imprenta y diseño general', colLeft + 8, rowY + 8, { width: cols[0].w });
      doc.text('1', cols[1].x, rowY + 8, { width: cols[1].w, align: 'center' });
      doc.text(`$${Number(factura.subtotal).toFixed(2)}`, cols[2].x, rowY + 8, { width: cols[2].w, align: 'right' });
      doc.text(`$${Number(factura.subtotal).toFixed(2)}`, cols[3].x, rowY + 8, { width: cols[3].w, align: 'right' });
      rowY += 26;
    } else {
      detalle.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? '#FFFFFF' : COLOR_LIGHT;
        doc.rect(colLeft, rowY, tableWidth, 24).fillAndStroke(bg, COLOR_BORDER);

        doc.fillColor(COLOR_DARK).fontSize(9).font('Helvetica');
        doc.text(item.producto,                                cols[0].x, rowY + 7, { width: cols[0].w });
        doc.text(String(item.cantidad),                        cols[1].x, rowY + 7, { width: cols[1].w, align: 'center' });
        doc.text(`$${Number(item.precio_unitario).toFixed(2)}`, cols[2].x, rowY + 7, { width: cols[2].w, align: 'right' });
        doc.text(`$${Number(item.subtotal).toFixed(2)}`,        cols[3].x, rowY + 7, { width: cols[3].w, align: 'right' });

        rowY += 24;
      });
    }

    // Bloque Totales
    const totalBoxW = 200;
    const totalBoxX = colLeft + tableWidth - totalBoxW;
    const totalsY   = rowY + 12;

    doc.rect(totalBoxX, totalsY, totalBoxW, 70).fillAndStroke(COLOR_LIGHT, COLOR_BORDER);

    // Subtotal
    doc.fillColor(COLOR_SECONDARY).fontSize(9).font('Helvetica').text('Subtotal:', totalBoxX + 10, totalsY + 8);
    doc.fillColor(COLOR_DARK).font('Helvetica-Bold').text(`$${Number(factura.subtotal).toFixed(2)}`, totalBoxX + 90, totalsY + 8, {
      width: 100,
      align: 'right',
    });

    // IVA
    const ivaPorc = factura.impuesto_porcentaje || 15;
    const ivaVal  = factura.impuesto_valor || (Number(factura.subtotal) * (ivaPorc / 100));
    doc.fillColor(COLOR_SECONDARY).fontSize(9).font('Helvetica').text(`IVA (${ivaPorc}%):`, totalBoxX + 10, totalsY + 24);
    doc.fillColor(COLOR_DARK).font('Helvetica-Bold').text(`$${Number(ivaVal).toFixed(2)}`, totalBoxX + 90, totalsY + 24, {
      width: 100,
      align: 'right',
    });

    // Total final
    doc.rect(totalBoxX, totalsY + 42, totalBoxW, 28).fill(COLOR_PRIMARY);
    doc.fillColor('#FFFFFF').fontSize(10).font('Helvetica-Bold').text('TOTAL:', totalBoxX + 10, totalsY + 50);
    doc.fontSize(11).text(`$${Number(factura.total).toFixed(2)}`, totalBoxX + 90, totalsY + 50, {
      width: 100,
      align: 'right',
    });

    // Observaciones
    if (factura.observaciones?.trim()) {
      const obsY = totalsY + 80;
      doc.fillColor(COLOR_SECONDARY).fontSize(9).font('Helvetica-Bold').text('OBSERVACIONES', colLeft, obsY);
      doc.fontSize(9).font('Helvetica').fillColor(COLOR_DARK).text(factura.observaciones.trim(), colLeft, obsY + 12, {
        width: tableWidth - totalBoxW - 20,
      });
    }

    // Footer
    const footerY = doc.page.height - 50;
    doc.rect(0, footerY, doc.page.width, 50).fill(COLOR_DARK);
    doc
      .fillColor('rgba(255,255,255,0.6)')
      .fontSize(8)
      .font('Helvetica')
      .text('Comprobante emitido por Imprenta PRO  •  Documento válido para fines comerciales y control interno.', 50, footerY + 18, {
        align: 'center',
        width: doc.page.width - 100,
      });

    doc.end();
  } catch (err) {
    console.error('Error al generar PDF de factura:', err);
    if (!res.headersSent) {
      res.status(500).json({ msg: 'Error interno al generar el PDF de la factura' });
    }
  }
};