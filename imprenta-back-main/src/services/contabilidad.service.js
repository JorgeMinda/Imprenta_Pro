// src/services/contabilidad.service.js
const pool = require('../config/db');
const repo = require('../repositories/contabilidad.repository');

class ContabilidadService {
  // Conversión segura a centavos para evitar errores de precisión de punto flotante
  toCents(amount) {
    return Math.round((Number(amount) || 0) * 100);
  }

  // ── CREAR ASIENTO CON TRANSACCIÓN ATÓMICA Y VALIDACIÓN ESTRICTA ────────────
  async crearAsiento({ fecha, tipo_fuente, referencia_id, concepto, estado = 'contabilizado', lineas }, usuarioId) {
    if (!concepto || !concepto.trim()) {
      throw { status: 400, message: 'El concepto o glosa del asiento es obligatorio' };
    }

    if (!Array.isArray(lineas) || lineas.length < 2) {
      throw { status: 400, message: 'Un asiento contable debe tener al menos 2 líneas de movimiento (partida doble)' };
    }

    // 1. Validar sumas de Débito y Crédito en centavos
    let sumaDebitoCentavos = 0;
    let sumaCreditoCentavos = 0;

    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      const debCents = this.toCents(l.debito);
      const credCents = this.toCents(l.credito);

      if (debCents < 0 || credCents < 0) {
        throw { status: 400, message: `Línea ${i + 1}: Los montos no pueden ser negativos` };
      }
      if (debCents === 0 && credCents === 0) {
        throw { status: 400, message: `Línea ${i + 1}: Debe especificar un valor en Débito o en Crédito` };
      }
      if (debCents > 0 && credCents > 0) {
        throw { status: 400, message: `Línea ${i + 1}: Una línea no puede tener valores en Débito y Crédito simultáneamente` };
      }

      sumaDebitoCentavos += debCents;
      sumaCreditoCentavos += credCents;
    }

    if (sumaDebitoCentavos === 0) {
      throw { status: 400, message: 'El valor total del asiento debe ser mayor a 0' };
    }

    // Validación de Partida Doble: Suma(Debe) === Suma(Haber)
    if (sumaDebitoCentavos !== sumaCreditoCentavos) {
      const diff = Math.abs(sumaDebitoCentavos - sumaCreditoCentavos) / 100;
      throw {
        status: 422,
        message: `El asiento está descuadrado por $${diff.toFixed(2)}. Total Débito ($${(sumaDebitoCentavos / 100).toFixed(2)}) != Total Crédito ($${(sumaCreditoCentavos / 100).toFixed(2)})`
      };
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 2. Validar que cada cuenta exista y permita movimientos directos
      for (let i = 0; i < lineas.length; i++) {
        const l = lineas[i];
        const cuenta = await repo.obtenerCuentaPorId(l.cuenta_id, client);
        if (!cuenta) {
          throw { status: 404, message: `Línea ${i + 1}: La cuenta ID ${l.cuenta_id} no existe` };
        }
        if (!cuenta.permite_movimiento) {
          throw {
            status: 400,
            message: `Línea ${i + 1}: La cuenta "${cuenta.codigo} - ${cuenta.nombre}" es de agrupación y no permite movimientos directos`
          };
        }
      }

      // 3. Generar correlativo
      const numeroAsiento = await repo.generarNumeroAsiento(client);

      const totalDebito = sumaDebitoCentavos / 100;
      const totalCredito = sumaCreditoCentavos / 100;

      // 4. Guardar encabezado
      const cabecera = await repo.crearAsientoCabecera(client, {
        numero_asiento: numeroAsiento,
        fecha: fecha || new Date(),
        tipo_fuente: tipo_fuente || 'manual',
        referencia_id: referencia_id || null,
        concepto: concepto.trim(),
        estado: estado || 'contabilizado',
        total_debito: totalDebito,
        total_credito: totalCredito,
        usuario_id: usuarioId || null
      });

      // 5. Guardar líneas
      const lineasGuardadas = [];
      for (const l of lineas) {
        const linea = await repo.crearLineaAsiento(client, {
          asiento_id: cabecera.id,
          cuenta_id: l.cuenta_id,
          debito: (this.toCents(l.debito) / 100) || 0,
          credito: (this.toCents(l.credito) / 100) || 0,
          descripcion: l.descripcion?.trim() || null
        });
        lineasGuardadas.push(linea);
      }

      // 6. Registro de Auditoría
      await repo.registrarAuditLog(client, {
        asiento_id: cabecera.id,
        usuario_id: usuarioId || null,
        accion: 'CREAR',
        detalles: { numero_asiento: numeroAsiento, total: totalDebito, concepto }
      });

      await client.query('COMMIT');

      return {
        ...cabecera,
        lineas: lineasGuardadas
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ── ANULAR ASIENTO CON TRANSACCIÓN ─────────────────────────────────────────
  async anularAsiento(asientoId, usuarioId, motivo) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const asiento = await repo.obtenerAsientoPorId(asientoId, client);
      if (!asiento) {
        throw { status: 404, message: 'Asiento contable no encontrado' };
      }
      if (asiento.estado === 'anulado') {
        throw { status: 400, message: 'El asiento ya se encuentra anulado' };
      }

      const anulado = await repo.anularAsiento(client, asientoId);

      await repo.registrarAuditLog(client, {
        asiento_id: asientoId,
        usuario_id: usuarioId || null,
        accion: 'ANULAR',
        detalles: { motivo: motivo || 'Anulación manual solicitada por usuario' }
      });

      await client.query('COMMIT');
      return anulado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ── CONSULTAS Y REPORTES ──────────────────────────────────────────────────
  async listarCuentas() {
    return await repo.listarCuentas();
  }

  async crearCuenta(data) {
    if (!data.codigo || !data.nombre || !data.tipo || !data.naturaleza) {
      throw { status: 400, message: 'Código, nombre, tipo y naturaleza son obligatorios' };
    }
    const existe = await repo.obtenerCuentaPorCodigo(data.codigo);
    if (existe) {
      throw { status: 409, message: `Ya existe una cuenta con el código ${data.codigo}` };
    }
    return await repo.crearCuenta(data);
  }

  async listarAsientos(filtros) {
    return await repo.listarAsientos(filtros);
  }

  async obtenerAsiento(id) {
    const asiento = await repo.obtenerAsientoPorId(id);
    if (!asiento) {
      throw { status: 404, message: 'Asiento contable no encontrado' };
    }
    return asiento;
  }

  async obtenerLibroMayor(cuentaId, fechaInicio, fechaFin) {
    return await repo.obtenerLibroMayor(cuentaId, fechaInicio, fechaFin);
  }

  async obtenerBalanceGeneral() {
    const cuentas = await repo.obtenerBalanceGeneral();

    let totalActivos = 0;
    let totalPasivos = 0;
    let totalPatrimonio = 0;

    const activos = [];
    const pasivos = [];
    const patrimonio = [];

    for (const c of cuentas) {
      const saldo = Number(c.saldo) || 0;
      if (c.tipo === 'activo') {
        activos.push(c);
        if (c.permite_movimiento) totalActivos += saldo;
      } else if (c.tipo === 'pasivo') {
        pasivos.push(c);
        if (c.permite_movimiento) totalPasivos += saldo;
      } else if (c.tipo === 'patrimonio') {
        patrimonio.push(c);
        if (c.permite_movimiento) totalPatrimonio += saldo;
      }
    }

    const pasivoMasPatrimonio = totalPasivos + totalPatrimonio;
    const diferencia = Math.abs(totalActivos - pasivoMasPatrimonio);
    const cuadrado = diferencia < 0.01;

    return {
      totalActivos,
      totalPasivos,
      totalPatrimonio,
      pasivoMasPatrimonio,
      diferencia,
      cuadrado,
      cuentas: { activos, pasivos, patrimonio }
    };
  }

  async obtenerEstadoResultados(fechaInicio, fechaFin) {
    const cuentas = await repo.obtenerEstadoResultados(fechaInicio, fechaFin);

    let totalIngresos = 0;
    let totalCostos = 0;
    let totalGastos = 0;

    const ingresos = [];
    const costos = [];
    const gastos = [];

    for (const c of cuentas) {
      const saldo = Number(c.saldo) || 0;
      if (c.tipo === 'ingreso') {
        ingresos.push(c);
        if (c.permite_movimiento) totalIngresos += saldo;
      } else if (c.tipo === 'costo') {
        costos.push(c);
        if (c.permite_movimiento) totalCostos += saldo;
      } else if (c.tipo === 'gasto') {
        gastos.push(c);
        if (c.permite_movimiento) totalGastos += saldo;
      }
    }

    const utilidadBruta = totalIngresos - totalCostos;
    const utilidadNeta = utilidadBruta - totalGastos;

    return {
      totalIngresos,
      totalCostos,
      totalGastos,
      utilidadBruta,
      utilidadNeta,
      cuentas: { ingresos, costos, gastos }
    };
  }

  async obtenerEstadoCuentaCliente(clienteId) {
    return await repo.obtenerEstadoCuentaCliente(clienteId);
  }
}

module.exports = new ContabilidadService();
