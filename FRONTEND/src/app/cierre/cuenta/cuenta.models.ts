import { CodigoDescuento } from '../juegos/juegos.model';

/**
 * ============================================================
 *  MÓDULO 4 - Puntos 21 y 22 - Cuenta, propina y pago - Lauti Fernandez
 * ============================================================
 */

export type NivelPropina = 'excelente' | 'muy_bueno' | 'bueno' | 'regular' | 'malo';

/** Los 5 QR de propina que pide la consigna (textual). */
export const NIVELES_PROPINA: { nivel: NivelPropina; texto: string; porcentaje: number }[] = [
  { nivel: 'excelente', texto: 'Excelente', porcentaje: 20 },
  { nivel: 'muy_bueno', texto: 'Muy bueno', porcentaje: 15 },
  { nivel: 'bueno', texto: 'Bueno', porcentaje: 10 },
  { nivel: 'regular', texto: 'Regular', porcentaje: 5 },
  { nivel: 'malo', texto: 'Malo', porcentaje: 0 },
];

export function infoPropina(nivel: NivelPropina) {
  return NIVELES_PROPINA.find((n) => n.nivel === nivel)!;
}

export interface ItemCuenta {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

/**
 * consumiendo → el cliente todavía no pidió la cuenta
 * pedida      → la pidió (el mozo fue avisado); falta elegir propina y pagar
 * pagada      → pagó (simulado) y espera que el mozo lo confirme
 * confirmada  → el mozo confirmó el pago y la mesa quedó libre
 */
export type EstadoCuenta = 'consumiendo' | 'pedida' | 'pagada' | 'confirmada';

export interface Cuenta {
  mesaNumero: number;
  items: ItemCuenta[];
  estado: EstadoCuenta;
  propina: NivelPropina | null;
  codigo: CodigoDescuento | null;
  pagadaEn: Date | null;
}

export interface ImportesCuenta {
  subtotal: number;
  descuento: number;
  /** Lo que queda después del descuento: sobre esto se calcula la propina. */
  base: number;
  propina: number;
  total: number;
}

/**
 * Cálculo de la cuenta (decisión del grupo: la propina va sobre el total
 * con descuento).
 *   subtotal  = suma de (cantidad × precio unitario)
 *   descuento = subtotal × % del código de los juegos
 *   propina   = (subtotal − descuento) × % del QR escaneado
 *   total     = subtotal − descuento + propina
 */
export function calcularImportes(cuenta: Cuenta): ImportesCuenta {
  const subtotal = cuenta.items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
  const descuento = Math.round((subtotal * (cuenta.codigo?.porcentaje ?? 0)) / 100);
  const base = subtotal - descuento;
  const propina = cuenta.propina ? Math.round((base * infoPropina(cuenta.propina).porcentaje) / 100) : 0;
  return { subtotal, descuento, base, propina, total: base + propina };
}

/** 36180 → "$36.180" */
export function formatearPesos(monto: number): string {
  return '$' + monto.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}