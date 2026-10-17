/**
 * ============================================================
 *  MÓDULO 4 - Punto 20 - Encuesta de satisfacción - Lauti Fernandez
 * ============================================================
 *
 * Tipos y opciones fijas de la encuesta. Cada pregunta usa un control
 * distinto (la consigna pide variedad de controles) y tres de ellas
 * alimentan los gráficos de resultados:
 *
 *   1. Calificación general  → estrellas 1 a 5    → gráfico de LÍNEA (promedio por día)
 *   2. Atención del mozo     → deslizador 0 a 10  → (dato)
 *   3. Lo que más gustó      → opciones múltiples → gráfico de BARRAS
 *   4. ¿Volverías?           → opción única       → gráfico de TORTA
 *   5. ¿Nos recomendarías?   → interruptor        → (dato)
 *   6. Comentario            → texto libre        → (dato)
 */

export type OpcionGusto = 'comida' | 'bebida' | 'postre' | 'atencion' | 'ambiente';
export type OpcionVolveria = 'si' | 'tal_vez' | 'no';

export const OPCIONES_GUSTO: { valor: OpcionGusto; texto: string }[] = [
  { valor: 'comida', texto: 'Comida' },
  { valor: 'bebida', texto: 'Bebida' },
  { valor: 'postre', texto: 'Postre' },
  { valor: 'atencion', texto: 'Atención' },
  { valor: 'ambiente', texto: 'Ambiente' },
];

export const OPCIONES_VOLVERIA: { valor: OpcionVolveria; texto: string }[] = [
  { valor: 'si', texto: 'Sí' },
  { valor: 'tal_vez', texto: 'Tal vez' },
  { valor: 'no', texto: 'No' },
];

/** Lo que completa el cliente. */
export interface RespuestaEncuesta {
  calificacion: number; // 1 a 5
  atencionMozo: number; // 0 a 10
  gustos: OpcionGusto[]; // al menos una
  volveria: OpcionVolveria;
  recomendaria: boolean;
  comentario: string; // opcional, puede quedar vacío
}

/** Lo que necesitan los gráficos (ya calculado). */
export interface ResumenEncuestas {
  total: number;
  volveria: Record<OpcionVolveria, number>;
  gustos: Record<OpcionGusto, number>;
  /** Últimos 7 días, del más viejo al de hoy. promedio = null si ese día no hubo encuestas. */
  calificacionPorDia: { fecha: Date; promedio: number | null }[];
  promedioSemana: number | null;
}