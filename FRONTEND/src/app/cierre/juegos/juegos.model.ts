/**
 * ============================================================
 *  MÓDULO 4 - Juegos (Punto 15) - Lauti Fernandez
 * ============================================================
 *
 * Tipos y datos fijos que comparten los tres juegos y la sección Juegos.
 *
 * Reglas acordadas:
 *  - Un intento CON PREMIO cada 24 h por cliente, contadas desde su último
 *    intento. El resto del tiempo se puede jugar libre, sin premio.
 *  - El juego que da premio rota en cada intento: trivia → ahorcado →
 *    cronómetro → trivia...
 *  - A mayor complejidad, mayor descuento.
 *  - El premio es un código que vence a las 24 h y se aplica al pedir la cuenta.
 */

export type JuegoId = 'trivia' | 'ahorcado' | 'cronometro';

export interface InfoJuego {
  id: JuegoId;
  nombre: string;
  descripcion: string;
  porcentaje: number;
  ruta: string;
  /** Nombre del ícono de Ionicons (se registra en la sección Juegos). */
  icono: string;
}

export const JUEGOS: Record<JuegoId, InfoJuego> = {
  trivia: {
    id: 'trivia',
    nombre: 'Trivia gastronómica',
    descripcion: '3 preguntas contra reloj',
    porcentaje: 10,
    ruta: '/cierre/juegos/trivia',
    icono: 'help-circle-outline',
  },
  ahorcado: {
    id: 'ahorcado',
    nombre: 'Ahorcado',
    descripcion: 'Adiviná el plato antes de quedarte sin vidas',
    porcentaje: 15,
    ruta: '/cierre/juegos/ahorcado',
    icono: 'text-outline',

  },
  cronometro: {
    id: 'cronometro',
    nombre: 'Frená el cronómetro',
    descripcion: 'Pará el reloj oculto a tiempo',
    porcentaje: 20,
    ruta: '/cierre/juegos/cronometro',
    icono: 'stopwatch-outline',
  },
};

/** Orden en el que rota el juego que da premio. */
export const ORDEN_ROTACION: JuegoId[] = ['trivia', 'ahorcado', 'cronometro'];

/**
 * A dónde vuelve el botón "Volver" de los juegos.
 * Cuando exista la sección Juegos (hub), se cambia a '/cierre/juegos' acá
 * y listo: los tres juegos toman este valor.
 */
/** A dónde vuelve el botón "Volver" de los juegos: la sección Juegos. */
export const RUTA_VOLVER_JUEGOS = '/cierre/juegos';

export interface CodigoDescuento {
  codigo: string; // ej. "MORFI-7K2Q"
  porcentaje: number;
  juego: JuegoId;
  venceEn: Date;
}

export interface EstadoJuegos {
  /** Juego que da premio en el próximo intento. */
  juegoConPremio: JuegoId;
  /** true si ya pasaron 24 h desde el último intento (o nunca jugó). */
  intentoDisponible: boolean;
  /** Cuándo vuelve a tener intento con premio (null si ya lo tiene). */
  proximoIntento: Date | null;
  /** Código ganado que todavía no venció ni se usó. */
  codigoActivo: CodigoDescuento | null;
}


export type EstadoCodigo = 'vigente' | 'usado' | 'vencido';

/** Un código del historial del cliente, con su estado actual ("Ver mis códigos"). */
export interface MiCodigo extends CodigoDescuento {
  estado: EstadoCodigo;
}