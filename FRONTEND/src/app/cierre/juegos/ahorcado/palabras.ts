/**
 * Palabras del Ahorcado. En cada partida sale una al azar.
 *
 * Se pueden escribir con tilde y con espacios ("TIRAMISÚ", "DULCE DE LECHE"):
 * al jugar, la tilde no cuenta (tocar la U destapa la Ú) y los espacios
 * aparecen solos. La Ñ sí es una letra aparte, como en el teclado.
 *
 * Para agregar una: sumá una línea con la palabra y su categoría (es la pista).
 */
export interface PalabraAhorcado {
  palabra: string;
  categoria: string;
}

export const PALABRAS_AHORCADO: PalabraAhorcado[] = [
  { palabra: 'MILANESA', categoria: 'Plato principal' },
  { palabra: 'EMPANADA', categoria: 'Plato principal' },
  { palabra: 'ASADO', categoria: 'Plato principal' },
  { palabra: 'LOCRO', categoria: 'Plato principal' },
  { palabra: 'RAVIOLES', categoria: 'Plato principal' },
  { palabra: 'ÑOQUIS', categoria: 'Plato principal' },
  { palabra: 'CHORIPÁN', categoria: 'Plato principal' },
  { palabra: 'MATAMBRE', categoria: 'Plato principal' },
  { palabra: 'LASAÑA', categoria: 'Plato principal' },
  { palabra: 'HAMBURGUESA', categoria: 'Plato principal' },
  { palabra: 'CANELONES', categoria: 'Plato principal' },
  { palabra: 'PROVOLETA', categoria: 'Entrada' },
  { palabra: 'PAPAS FRITAS', categoria: 'Acompañamiento' },
  { palabra: 'CHIMICHURRI', categoria: 'Salsa' },
  { palabra: 'FLAN', categoria: 'Postre' },
  { palabra: 'ALFAJOR', categoria: 'Postre' },
  { palabra: 'TIRAMISÚ', categoria: 'Postre' },
  { palabra: 'PANQUEQUE', categoria: 'Postre' },
  { palabra: 'DULCE DE LECHE', categoria: 'Postre' },
  { palabra: 'LIMONADA', categoria: 'Bebida' },
  { palabra: 'CERVEZA', categoria: 'Bebida' },
  { palabra: 'LICUADO', categoria: 'Bebida' },
];