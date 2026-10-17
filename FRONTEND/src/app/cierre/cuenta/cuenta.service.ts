import { Service, inject } from '@angular/core';
import { JuegosService } from '../juegos/juegos.service';
import { Cuenta, NivelPropina, calcularImportes, formatearPesos } from './cuenta.models';

/**
 * ============================================================
 *  MÓDULO 4 - Puntos 21 y 22 - Cuenta y pago - SERVICIO SIMULADO
 * ============================================================
 *
 * Guarda todo EN MEMORIA (se reinicia al recargar), igual que juegos y
 * encuestas. Simula dos mesas:
 *  - Mesa 4: la del cliente que usa la app (con un pedido ya entregado).
 *  - Mesa 7: otra mesa que pidió la cuenta, para que la pantalla del mozo
 *    no arranque vacía.
 *
 * Las notificaciones push quedan anotadas en `avisar()`: hoy solo se
 * escriben en la consola del navegador.
 *
 * Pendiente para la etapa de backend:
 *  - Leer los ítems reales del pedido (tablas del Módulo 3).
 *  - Enviar las push reales (servicio de notificaciones del Módulo 1):
 *      pedir cuenta → mozo
 *      pagar        → mozo, dueño y supervisor
 *      confirmar    → dueño y supervisor
 *  - Liberar la mesa en la base (disponibilidad = 'vacia').
 */
@Service()
export class CuentaService {
  private readonly juegos = inject(JuegosService);

  private readonly mesaDelCliente = 4;
  private readonly cuentas = new Map<number, Cuenta>([
    [
      4,
      {
        mesaNumero: 4,
        items: [
          { nombre: 'Hamburguesa Big Morfi Suprema', cantidad: 2, precioUnitario: 12500 },
          { nombre: 'Coca-Cola 500 ml', cantidad: 2, precioUnitario: 2500 },
          { nombre: 'Flan casero', cantidad: 1, precioUnitario: 3500 },
        ],
        estado: 'consumiendo',
        propina: null,
        codigo: null,
        pagadaEn: null,
      },
    ],
    [
      7,
      {
        mesaNumero: 7,
        items: [
          { nombre: 'Milanesa napolitana', cantidad: 1, precioUnitario: 14000 },
          { nombre: 'Agua sin gas', cantidad: 1, precioUnitario: 1800 },
        ],
        estado: 'pedida',
        propina: null,
        codigo: null,
        pagadaEn: null,
      },
    ],
  ]);

  // ---- Lado del cliente (Punto 21) ----

  async obtenerMiCuenta(): Promise<Cuenta> {
    return this.copia(this.cuentaDelCliente());
  }

  async pedirCuenta(): Promise<Cuenta> {
    const cuenta = this.cuentaDelCliente();
    if (cuenta.estado !== 'consumiendo') throw new Error('La cuenta ya fue pedida.');
    cuenta.estado = 'pedida';
    this.avisar(['mozo'], `La mesa ${cuenta.mesaNumero} pidió la cuenta.`);
    return this.copia(cuenta);
  }

  async elegirPropina(nivel: NivelPropina): Promise<Cuenta> {
    const cuenta = this.cuentaDelCliente();
    if (cuenta.estado !== 'pedida') throw new Error('Primero tenés que pedir la cuenta.');
    cuenta.propina = nivel;
    return this.copia(cuenta);
  }

  async aplicarCodigo(texto: string): Promise<Cuenta> {
    const cuenta = this.cuentaDelCliente();
    if (cuenta.estado !== 'pedida') throw new Error('Solo se puede aplicar antes de pagar.');
    cuenta.codigo = await this.juegos.validarCodigo(texto); // tira error con el motivo si no sirve
    return this.copia(cuenta);
  }

  async quitarCodigo(): Promise<Cuenta> {
    const cuenta = this.cuentaDelCliente();
    if (cuenta.estado === 'pedida') cuenta.codigo = null;
    return this.copia(cuenta);
  }

  /** Pago simulado: queda esperando que el mozo lo confirme. */
  async pagar(): Promise<Cuenta> {
    const cuenta = this.cuentaDelCliente();
    if (cuenta.estado !== 'pedida') throw new Error('No hay una cuenta para pagar.');
    if (!cuenta.propina) throw new Error('Antes de pagar tenés que escanear el QR de propina.');

    // El código se vuelve a validar al pagar (pudo vencer mientras tanto).
    if (cuenta.codigo) cuenta.codigo = await this.juegos.validarCodigo(cuenta.codigo.codigo);

    cuenta.estado = 'pagada';
    cuenta.pagadaEn = new Date();
    const total = formatearPesos(calcularImportes(cuenta).total);
    this.avisar(['mozo', 'dueño', 'supervisor'], `La mesa ${cuenta.mesaNumero} pagó ${total}. Falta confirmar.`);
    return this.copia(cuenta);
  }

  // ---- Lado del mozo (Punto 22) ----

  /** Mesas que pidieron la cuenta o pagaron, primero las que esperan confirmación. */
  async listarParaMozo(): Promise<Cuenta[]> {
    return [...this.cuentas.values()]
      .filter((c) => c.estado === 'pedida' || c.estado === 'pagada')
      .sort((a, b) => (a.estado === b.estado ? a.mesaNumero - b.mesaNumero : a.estado === 'pagada' ? -1 : 1))
      .map((c) => this.copia(c));
  }

  async confirmarPago(mesaNumero: number): Promise<void> {
    const cuenta = this.cuentas.get(mesaNumero);
    if (!cuenta || cuenta.estado !== 'pagada') throw new Error('Esa mesa no tiene un pago para confirmar.');

    cuenta.estado = 'confirmada';
    if (cuenta.codigo) await this.juegos.marcarCodigoUsado(cuenta.codigo.codigo);

    // Acá, con backend: mesas.disponibilidad = 'vacia' (el cliente tiene que volver a escanear el QR de mesa).
    this.avisar(['dueño', 'supervisor'], `El mozo confirmó el pago de la mesa ${mesaNumero}. La mesa quedó libre.`);
  }

  // ---------------------------------------------------------------------

  private cuentaDelCliente(): Cuenta {
    return this.cuentas.get(this.mesaDelCliente)!;
  }

  /** Copia para que las pantallas no modifiquen el "estado guardado" sin pasar por el servicio. */
  private copia(c: Cuenta): Cuenta {
    return { ...c, items: c.items.map((i) => ({ ...i })), codigo: c.codigo ? { ...c.codigo } : null };
  }

  /** Simulación de push notification (ver "Pendiente para la etapa de backend"). */
  private avisar(destinatarios: string[], mensaje: string) {
    console.info(`[PUSH simulada → ${destinatarios.join(', ')}] ${mensaje}`);
  }
}