/**
 * Banco de preguntas de la Trivia gastronómica.
 * En cada partida salen 3 al azar y las opciones se mezclan, así que la
 * respuesta correcta no queda siempre en la misma letra.
 *
 * Para agregar una pregunta: copiá un bloque y cambiá los textos.
 * `correcta` es la posición (0 a 3) de la opción correcta en `opciones`.
 */
export interface PreguntaTrivia {
  texto: string;
  opciones: [string, string, string, string];
  correcta: 0 | 1 | 2 | 3;
}

export const PREGUNTAS_TRIVIA: PreguntaTrivia[] = [
  { texto: '¿De qué país es originario el ceviche?', opciones: ['México', 'Perú', 'España', 'Chile'], correcta: 1 },
  { texto: '¿Cuál es el ingrediente principal del guacamole?', opciones: ['Tomate', 'Palta', 'Pepino', 'Morrón'], correcta: 1 },
  { texto: '¿Qué cereal se usa para hacer un risotto?', opciones: ['Trigo', 'Cebada', 'Arroz', 'Avena'], correcta: 2 },
  { texto: '¿Qué es el chimichurri?', opciones: ['Un corte de carne', 'Una salsa', 'Un postre', 'Un tipo de pan'], correcta: 1 },
  { texto: '¿De qué país es típico el sushi?', opciones: ['China', 'Corea', 'Tailandia', 'Japón'], correcta: 3 },
  { texto: '¿Cuál de estos es un corte de carne vacuna?', opciones: ['Vacío', 'Bondiola', 'Panceta', 'Pechuga'], correcta: 0 },
  { texto: '¿Qué legumbre es la base del hummus?', opciones: ['Lenteja', 'Poroto', 'Garbanzo', 'Arveja'], correcta: 2 },
  { texto: '¿Qué hierba es la base de la salsa pesto?', opciones: ['Albahaca', 'Perejil', 'Orégano', 'Menta'], correcta: 0 },
  { texto: '¿Qué bebida se prepara con yerba?', opciones: ['Café', 'Mate', 'Chocolatada', 'Sidra'], correcta: 1 },
  { texto: '¿De qué país es típica la paella?', opciones: ['Italia', 'Portugal', 'España', 'Francia'], correcta: 2 },
  { texto: '¿Con qué fruta se hace la sidra?', opciones: ['Uva', 'Pera', 'Durazno', 'Manzana'], correcta: 3 },
  { texto: '¿Cuál es el ingrediente principal de la polenta?', opciones: ['Harina de maíz', 'Harina de trigo', 'Papa', 'Arroz'], correcta: 0 },
  { texto: '¿Qué queso lleva la pizza margherita clásica?', opciones: ['Roquefort', 'Mozzarella', 'Parmesano', 'Cheddar'], correcta: 1 },
  { texto: '¿Qué especia le da el color amarillo a la paella?', opciones: ['Pimentón', 'Comino', 'Azafrán', 'Canela'], correcta: 2 },
  { texto: '¿Qué es el tiramisú?', opciones: ['Una pasta', 'Un postre', 'Un vino', 'Una sopa'], correcta: 1 },
  { texto: '¿Cuál de estos platos lleva carne picada?', opciones: ['Ensalada César', 'Ceviche', 'Tortilla de papas', 'Lasaña a la boloñesa'], correcta: 3 },
  { texto: '¿Qué se obtiene al fermentar el jugo de uva?', opciones: ['Vino', 'Cerveza', 'Sidra', 'Vinagre de manzana'], correcta: 0 },
  { texto: '¿Qué ingrediente NO lleva una tortilla de papas clásica?', opciones: ['Huevo', 'Papa', 'Aceite', 'Harina'], correcta: 3 },
  { texto: '¿Qué es el locro?', opciones: ['Un postre', 'Una bebida', 'Un guiso', 'Un pan'], correcta: 2 },
  { texto: '¿Qué ingrediente se usa para hacer el dulce de leche?', opciones: ['Leche y azúcar', 'Crema y miel', 'Leche y harina', 'Manteca y azúcar'], correcta: 0 },
];