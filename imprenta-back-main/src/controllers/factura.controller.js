// src/controllers/factura.controller.js
const PDFDocument = require('pdfkit');
const pool = require('../config/db');

exports.generarFactura = async (req, res) => {
  const { ordenId } = req.params;

  try {
    // ─── 1. Datos de la orden + cliente + total ──────────────────────────────
    // CORRECCIONES:
    //   • Tabla sin tilde: ordenes_trabajo  (no "órdenes_trabajo")
    //   • Columna: cotizacion_id            (no id_cotizacion)
    const ordenRes = await pool.query(
      `SELECT
          ot.id,
          ot.cotizacion_id,
          ot.estado,
          ot.fecha_entrega,
          ot.observaciones,
          cl.nombre      AS cliente,
          cl.direccion,
          cl.email,
          cl.telefono,
          c.total
       FROM ordenes_trabajo ot
       JOIN cotizaciones    c  ON ot.cotizacion_id = c.id
       LEFT JOIN clientes   cl ON c.cliente_id     = cl.id
       WHERE ot.id = $1
         AND LOWER(ot.estado) = 'entregada'`,
      [ordenId]
    );

    if (ordenRes.rowCount === 0) {
      return res.status(404).json({
        msg: 'Orden no encontrada o aún no está en estado "Entregada"',
      });
    }

    const orden = ordenRes.rows[0];

    // ─── 2. Detalle de productos de la cotización ────────────────────────────
    const detalleRes = await pool.query(
      `SELECT
          p.nombre        AS producto,
          dc.cantidad,
          dc.precio_unitario,
          dc.subtotal
       FROM detalle_cotizacion dc
       JOIN productos p ON dc.producto_id = p.id
       WHERE dc.cotizacion_id = $1`,
      [orden.cotizacion_id]
    );

    const detalle = detalleRes.rows;

    // ─── 3. Generar PDF ──────────────────────────────────────────────────────
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=factura-orden-${ordenId}.pdf`
    );

    doc.pipe(res);

    // ── Paleta
    const COLOR_PRIMARY   = '#4F46E5'; // indigo-600
    const COLOR_SECONDARY = '#6B7280'; // gray-500
    const COLOR_DARK      = '#111827'; // gray-900
    const COLOR_LIGHT     = '#F9FAFB'; // gray-50
    const COLOR_BORDER    = '#E5E7EB'; // gray-200

    // ── Encabezado con fondo
    doc.rect(0, 0, doc.page.width, 100).fill(COLOR_PRIMARY);

    doc
      .fillColor('#FFFFFF')
      .fontSize(26)
      .font('Helvetica-Bold')
      .text('IMPRENTA PRO', 50, 28);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('rgba(255,255,255,0.75)')
      .text('Sistema de Gestión de Imprentas', 50, 58);

    // Número de factura (derecha)
    doc
      .fillColor('#FFFFFF')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(`FACTURA #${orden.id}`, 0, 28, { align: 'right', width: doc.page.width - 50 });

    const fechaEmision = new Date().toLocaleDateString('es-EC', { dateStyle: 'long' });
    doc
      .fillColor('rgba(255,255,255,0.75)')
      .fontSize(9)
      .font('Helvetica')
      .text(`Fecha de emisión: ${fechaEmision}`, 0, 50, { align: 'right', width: doc.page.width - 50 });

    // ── Separador tras cabecera
    doc.moveDown(3.5);

    // ── Bloque cliente / detalle orden
    const startY = 120;
    const colLeft  = 50;
    const colRight = 310;
    const boxH     = 100;

    // Box cliente
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
      .text(orden.cliente || 'Consumidor Final', colLeft + 12, startY + 26, { width: 206 });

    doc
      .fillColor(COLOR_SECONDARY)
      .fontSize(9)
      .font('Helvetica')
      .text(orden.direccion || 'Sin dirección registrada', colLeft + 12, startY + 46, { width: 206 })
      .text(orden.email    || 'Sin email registrado',     colLeft + 12, startY + 60, { width: 206 })
      .text(orden.telefono || 'Sin teléfono registrado',  colLeft + 12, startY + 74, { width: 206 });

    // Box orden
    doc
      .rect(colRight, startY, 230, boxH)
      .fillAndStroke(COLOR_LIGHT, COLOR_BORDER);

    doc
      .fillColor(COLOR_PRIMARY)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('DETALLES DE LA ORDEN', colRight + 12, startY + 10);

    const infoRows = [
      ['Orden de trabajo', `#${orden.id}`],
      ['Cotización',       `#${orden.cotizacion_id}`],
      ['Fecha de entrega', orden.fecha_entrega
          ? new Date(orden.fecha_entrega).toLocaleDateString('es-EC', { dateStyle: 'medium' })
          : '—'],
    ];

    infoRows.forEach(([key, val], i) => {
      const y = startY + 28 + i * 16;
      doc.fillColor(COLOR_SECONDARY).fontSize(9).font('Helvetica').text(key, colRight + 12, y);
      doc.fillColor(COLOR_DARK).font('Helvetica-Bold').text(val, colRight + 130, y, { width: 100 });
    });

    // ── Tabla de productos
    const tableTop = startY + boxH + 24;
    const tableWidth = doc.page.width - 100;

    // Cabecera tabla
    doc.rect(colLeft, tableTop, tableWidth, 22).fill(COLOR_PRIMARY);

    const cols = [
      { label: 'Producto',        x: colLeft + 8,   w: 200 },
      { label: 'Cant.',           x: colLeft + 215,  w: 50  },
      { label: 'Precio Unit.',    x: colLeft + 270,  w: 90  },
      { label: 'Subtotal',        x: colLeft + 365,  w: 90  },
    ];

    cols.forEach(c => {
      doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold').text(c.label, c.x, tableTop + 6, { width: c.w });
    });

    // Filas
    let rowY = tableTop + 22;
    if (detalle.length === 0) {
      doc
        .rect(colLeft, rowY, tableWidth, 24)
        .fillAndStroke('#FFFFFF', COLOR_BORDER);
      doc
        .fillColor(COLOR_SECONDARY)
        .fontSize(9)
        .font('Helvetica')
        .text('Sin productos registrados en esta cotización.', colLeft + 8, rowY + 7, { width: tableWidth - 16 });
      rowY += 24;
    } else {
      detalle.forEach((item, idx) => {
        const bg = idx % 2 === 0 ? '#FFFFFF' : COLOR_LIGHT;
        doc.rect(colLeft, rowY, tableWidth, 24).fillAndStroke(bg, COLOR_BORDER);

        doc.fillColor(COLOR_DARK).fontSize(9).font('Helvetica');
        doc.text(item.producto,                                                    cols[0].x, rowY + 7, { width: cols[0].w });
        doc.text(String(item.cantidad),                                            cols[1].x, rowY + 7, { width: cols[1].w });
        doc.text(`$${Number(item.precio_unitario).toFixed(2)}`,                   cols[2].x, rowY + 7, { width: cols[2].w });
        doc.text(`$${Number(item.subtotal).toFixed(2)}`,                          cols[3].x, rowY + 7, { width: cols[3].w });

        rowY += 24;
      });
    }

    // ── Total
    const totalY = rowY + 8;
    doc
      .rect(colLeft + tableWidth - 180, totalY, 180, 30)
      .fillAndStroke(COLOR_PRIMARY, COLOR_PRIMARY);

    doc
      .fillColor('#FFFFFF')
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('TOTAL:', colLeft + tableWidth - 175, totalY + 8, { width: 80 });

    doc
      .text(`$${Number(orden.total).toFixed(2)}`, colLeft + tableWidth - 90, totalY + 8, {
        width: 80,
        align: 'right',
      });

    // ── Observaciones
    if (orden.observaciones?.trim()) {
      const obsY = totalY + 50;
      doc
        .fillColor(COLOR_SECONDARY)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text('OBSERVACIONES', colLeft, obsY);

      doc
        .fontSize(9)
        .font('Helvetica')
        .fillColor(COLOR_DARK)
        .text(orden.observaciones.trim(), colLeft, obsY + 14, { width: tableWidth });
    }

    // ── Footer
    const footerY = doc.page.height - 55;
    doc.rect(0, footerY, doc.page.width, 55).fill(COLOR_DARK);

    doc
      .fillColor('rgba(255,255,255,0.5)')
      .fontSize(8)
      .font('Helvetica')
      .text('Gracias por confiar en Imprenta PRO  •  Este documento es generado automáticamente.', 50, footerY + 14, {
        align: 'center',
        width: doc.page.width - 100,
      });

    doc.end();

  } catch (err) {
    console.error('Error al generar factura:', err);
    // Solo enviamos JSON si los headers aún no se mandaron
    if (!res.headersSent) {
      res.status(500).json({ msg: 'Error interno al generar la factura' });
    }
  }
};