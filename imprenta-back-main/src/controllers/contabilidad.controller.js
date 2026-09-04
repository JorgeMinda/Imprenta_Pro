// src/controllers/contabilidad.controller.js
const service = require('../services/contabilidad.service');
const PDFDocument = require('pdfkit');
const auditService = require('../services/audit.service');

exports.listarCuentas = async (req, res) => {
  try {
    const data = await service.listarCuentas();
    res.json(data);
  } catch (err) {
    console.error('Error al listar cuentas:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Error al obtener plan de cuentas' });
  }
};

exports.crearCuenta = async (req, res) => {
  try {
    const data = await service.crearCuenta(req.body);
    await auditService.registrar(req, {
      modulo: 'contabilidad',
      accion: 'CREAR',
      entidad_id: data.id,
      descripcion: `Nueva cuenta contable creada: ${data.codigo} - ${data.nombre}`,
      detalles: data
    });
    res.status(201).json({ msg: 'Cuenta creada exitosamente', cuenta: data });
  } catch (err) {
    console.error('Error al crear cuenta:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Error al crear cuenta' });
  }
};

exports.listarAsientos = async (req, res) => {
  try {
    const filtros = {
      fechaInicio: req.query.fechaInicio,
      fechaFin:    req.query.fechaFin,
      tipoFuente:  req.query.tipoFuente,
      estado:      req.query.estado,
      busqueda:    req.query.busqueda,
    };
    const data = await service.listarAsientos(filtros);
    res.json(data);
  } catch (err) {
    console.error('Error al listar asientos:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Error al obtener libro diario' });
  }
};

exports.obtenerAsiento = async (req, res) => {
  try {
    const data = await service.obtenerAsiento(req.params.id);
    res.json(data);
  } catch (err) {
    console.error('Error al obtener asiento:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Error al obtener detalle del asiento' });
  }
};

exports.crearAsiento = async (req, res) => {
  try {
    const usuarioId = req.user?.id;
    const data = await service.crearAsiento(req.body, usuarioId);

    await auditService.registrar(req, {
      modulo: 'contabilidad',
      accion: 'CREAR',
      entidad_id: data.id,
      descripcion: `Asiento contable registrado: ${data.numero_asiento} ($${data.total_debito})`,
      detalles: { numero_asiento: data.numero_asiento, total: data.total_debito, concepto: data.concepto }
    });

    res.status(201).json({ msg: 'Asiento contable registrado exitosamente', asiento: data });
  } catch (err) {
    console.error('Error al crear asiento:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Error al registrar asiento' });
  }
};

exports.anularAsiento = async (req, res) => {
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuarioId = req.user?.id;
    const data = await service.anularAsiento(id, usuarioId, motivo);

    await auditService.registrar(req, {
      modulo: 'contabilidad',
      accion: 'ANULAR',
      entidad_id: id,
      descripcion: `Asiento contable anulado ID ${id}: ${motivo || 'Sin motivo especificado'}`,
      detalles: { id, motivo }
    });

    res.json({ msg: 'Asiento anulado correctamente', asiento: data });
  } catch (err) {
    console.error('Error al anular asiento:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Error al anular asiento' });
  }
};

exports.obtenerLibroMayor = async (req, res) => {
  try {
    const { cuentaId } = req.params;
    const { fechaInicio, fechaFin } = req.query;
    const data = await service.obtenerLibroMayor(cuentaId, fechaInicio, fechaFin);
    res.json(data);
  } catch (err) {
    console.error('Error al obtener libro mayor:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Error al obtener libro mayor' });
  }
};

exports.obtenerBalanceGeneral = async (req, res) => {
  try {
    const data = await service.obtenerBalanceGeneral();
    res.json(data);
  } catch (err) {
    console.error('Error al obtener balance general:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Error al calcular balance general' });
  }
};

exports.obtenerEstadoResultados = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const data = await service.obtenerEstadoResultados(fechaInicio, fechaFin);
    res.json(data);
  } catch (err) {
    console.error('Error al obtener estado de resultados:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Error al calcular estado de resultados' });
  }
};

exports.obtenerEstadoCuentaCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const data = await service.obtenerEstadoCuentaCliente(clienteId);
    res.json(data);
  } catch (err) {
    console.error('Error al obtener estado de cuenta de cliente:', err);
    res.status(err.status || 500).json({ msg: err.message || 'Error al obtener estado de cuenta' });
  }
};

// ── GENERAR PDF: BALANCE GENERAL ───────────────────────────────────────────
exports.generarBalancePDF = async (req, res) => {
  try {
    const balance = await service.obtenerBalanceGeneral();

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Balance_General.pdf"');
    doc.pipe(res);

    // Encabezado
    doc.rect(40, 40, 515, 60).fill('#1E293B');
    doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
       .text('IMPRENTA PRO — SISTEMA CONTABLE', 55, 52);
    doc.fontSize(12).font('Helvetica')
       .text('Balance General (Estado de Situación Financiera)', 55, 75);

    doc.fillColor('#0F172A').fontSize(10).font('Helvetica');
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-EC')}`, 40, 115);
    doc.text(`Estado: ${balance.cuadrado ? 'CUADRADO Y VERIFICADO (Partida Doble)' : 'DESCUADRADO'}`, 40, 130);

    let y = 160;

    const renderSeccion = (titulo, items, color) => {
      if (y > 700) { doc.addPage(); y = 50; }
      doc.rect(40, y, 515, 22).fill(color);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text(titulo, 48, y + 5);
      y += 28;

      items.forEach(c => {
        if (y > 750) { doc.addPage(); y = 50; }
        const esPadre = !c.permite_movimiento;
        doc.font(esPadre ? 'Helvetica-Bold' : 'Helvetica')
           .fontSize(9)
           .fillColor(esPadre ? '#1E293B' : '#475569');
        
        doc.text(`${c.codigo}  ${c.nombre}`, 48, y);
        doc.text(`$${Number(c.saldo).toFixed(2)}`, 450, y, { align: 'right', width: 95 });
        y += 16;
      });
      y += 10;
    };

    renderSeccion('1. ACTIVOS', balance.cuentas.activos, '#2563EB');
    renderSeccion('2. PASIVOS', balance.cuentas.pasivos, '#DC2626');
    renderSeccion('3. PATRIMONIO', balance.cuentas.patrimonio, '#7C3AED');

    if (y > 680) { doc.addPage(); y = 50; }
    doc.rect(40, y, 515, 50).fill('#F1F5F9');
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11);
    doc.text(`TOTAL ACTIVOS: $${balance.totalActivos.toFixed(2)}`, 55, y + 12);
    doc.text(`PASIVO + PATRIMONIO: $${balance.pasivoMasPatrimonio.toFixed(2)}`, 55, y + 28);
    doc.text(`Diferencia: $${balance.diferencia.toFixed(2)}`, 400, y + 20, { align: 'right', width: 140 });

    doc.end();
  } catch (err) {
    console.error('Error generando PDF de balance:', err);
    res.status(500).json({ msg: 'Error al generar PDF del balance' });
  }
};

// ── GENERAR PDF: ESTADO DE RESULTADOS ──────────────────────────────────────
exports.generarEstadoResultadosPDF = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    const data = await service.obtenerEstadoResultados(fechaInicio, fechaFin);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="Estado_Resultados.pdf"');
    doc.pipe(res);

    doc.rect(40, 40, 515, 60).fill('#065F46');
    doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
       .text('IMPRENTA PRO — ESTADO DE RESULTADOS', 55, 52);
    doc.fontSize(12).font('Helvetica')
       .text('Pérdidas y Ganancias del Ejercicio', 55, 75);

    doc.fillColor('#0F172A').fontSize(10).font('Helvetica');
    doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-EC')}`, 40, 115);

    let y = 150;

    const renderGrupo = (titulo, items, total, color) => {
      doc.rect(40, y, 515, 22).fill(color);
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(11).text(titulo, 48, y + 5);
      y += 28;

      items.forEach(c => {
        if (y > 750) { doc.addPage(); y = 50; }
        doc.font(c.permite_movimiento ? 'Helvetica' : 'Helvetica-Bold')
           .fontSize(9)
           .fillColor(c.permite_movimiento ? '#475569' : '#1E293B');
        doc.text(`${c.codigo}  ${c.nombre}`, 48, y);
        doc.text(`$${Number(c.saldo).toFixed(2)}`, 450, y, { align: 'right', width: 95 });
        y += 16;
      });

      doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A');
      doc.text(`Total ${titulo}: $${total.toFixed(2)}`, 350, y, { align: 'right', width: 195 });
      y += 25;
    };

    renderGrupo('INGRESOS OPERACIONALES', data.cuentas.ingresos, data.totalIngresos, '#047857');
    renderGrupo('COSTOS DE PRODUCCIÓN', data.cuentas.costos, data.totalCostos, '#B45309');
    renderGrupo('GASTOS OPERATIVOS', data.cuentas.gastos, data.totalGastos, '#B91C1C');

    doc.rect(40, y, 515, 45).fill(data.utilidadNeta >= 0 ? '#DCFCE7' : '#FEE2E2');
    doc.fillColor(data.utilidadNeta >= 0 ? '#15803D' : '#B91C1C').font('Helvetica-Bold').fontSize(13);
    doc.text(`UTILIDAD NETA DEL EJERCICIO: $${data.utilidadNeta.toFixed(2)}`, 55, y + 16);

    doc.end();
  } catch (err) {
    console.error('Error generando PDF de estado de resultados:', err);
    res.status(500).json({ msg: 'Error al generar PDF' });
  }
};
