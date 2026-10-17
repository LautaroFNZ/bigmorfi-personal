import { Service } from '@angular/core';
import { OpcionGusto, OpcionVolveria, RespuestaEncuesta, ResumenEncuestas } from './encuesta.models';

const DIAS_GRAFICO = 7;
const MS_POR_DIA = 24 * 60 * 60 * 1000;

interface EncuestaGuardada extends RespuestaEncuesta {
  fecha: Date;
}

/**
 * ============================================================
 *  MÓDULO 4 - Punto 20 - Encuestas - SERVICIO SIMULADO
 * ============================================================
 *
 * Igual que el de juegos: guarda todo EN MEMORIA y arranca con 50
 * encuestas de ejemplo repartidas en la última semana, para que los
 * gráficos tengan algo que mostrar. Al recargar la página se reinicia.
 *
 * Cuando hagamos el backend, solo cambia el interior de estos métodos
 * por llamadas a la API (las pantallas ya trabajan con Promises).
 *
 * Pendiente para la etapa de backend:
 *  - Guardar las encuestas en Supabase.
 *  - "Una por estadía": hoy se controla con un flag en memoria; en real se
 *    valida contra la estadía del cliente (pedido / mesa asignada).
 */
@Service()
export class EncuestaService {
  private readonly encuestas: EncuestaGuardada[] = generarEjemplos(50);
  private respondioEstaEstadia = false;

  /** ¿El cliente ya completó la encuesta de esta visita? */
  async yaRespondio(): Promise<boolean> {
    return this.respondioEstaEstadia;
  }

  async enviar(respuesta: RespuestaEncuesta): Promise<void> {
    if (this.respondioEstaEstadia) {
      throw new Error('Ya completaste la encuesta de esta visita.');
    }
    this.encuestas.push({ ...respuesta, comentario: respuesta.comentario.trim(), fecha: new Date() });
    this.respondioEstaEstadia = true;
  }

  /** Arma los totales que usan los tres gráficos. */
  async obtenerResumen(): Promise<ResumenEncuestas> {
    const volveria: Record<OpcionVolveria, number> = { si: 0, tal_vez: 0, no: 0 };
    const gustos: Record<OpcionGusto, number> = { comida: 0, bebida: 0, postre: 0, atencion: 0, ambiente: 0 };

    for (const e of this.encuestas) {
      volveria[e.volveria]++;
      for (const g of e.gustos) gustos[g]++;
    }

    // Promedio de estrellas por día, de hace 6 días a hoy.
    const hoy = inicioDelDia(new Date());
    const calificacionPorDia = Array.from({ length: DIAS_GRAFICO }, (_, i) => {
      const fecha = new Date(hoy.getTime() - (DIAS_GRAFICO - 1 - i) * MS_POR_DIA);
      const delDia = this.encuestas.filter((e) => inicioDelDia(e.fecha).getTime() === fecha.getTime());
      return { fecha, promedio: promedio(delDia.map((e) => e.calificacion)) };
    });

    const desde = hoy.getTime() - (DIAS_GRAFICO - 1) * MS_POR_DIA;
    const deLaSemana = this.encuestas.filter((e) => e.fecha.getTime() >= desde);

    return {
      total: this.encuestas.length,
      volveria,
      gustos,
      calificacionPorDia,
      promedioSemana: promedio(deLaSemana.map((e) => e.calificacion)),
    };
  }
}

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function promedio(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return Math.round((valores.reduce((a, b) => a + b, 0) / valores.length) * 10) / 10;
}

/**
 * Encuestas de ejemplo con valores "creíbles" (la mayoría positivas).
 * Usa un generador con semilla fija: siempre salen las mismas, así los
 * gráficos no cambian cada vez que se recarga.
 */
function generarEjemplos(cantidad: number): EncuestaGuardada[] {
  let semilla = 7;
  const azar = () => {
    semilla = (semilla * 16807) % 2147483647;
    return (semilla - 1) / 2147483646;
  };
  const elegir = <T>(pesos: [T, number][]): T => {
    let r = azar() * pesos.reduce((a, [, p]) => a + p, 0);
    for (const [valor, p] of pesos) {
      if ((r -= p) <= 0) return valor;
    }
    return pesos[0][0];
  };

  const hoy = inicioDelDia(new Date()).getTime();
  return Array.from({ length: cantidad }, () => {
    const calificacion = elegir<number>([[5, 45], [4, 35], [3, 12], [2, 5], [1, 3]]);
    const gustos = (['comida', 'atencion', 'ambiente', 'postre', 'bebida'] as OpcionGusto[]).filter(
      (_, i) => azar() < [0.75, 0.55, 0.42, 0.36, 0.25][i],
    );
    return {
      fecha: new Date(hoy - Math.floor(azar() * DIAS_GRAFICO) * MS_POR_DIA + 13 * 60 * 60 * 1000),
      calificacion,
      atencionMozo: Math.min(10, Math.max(0, calificacion * 2 - Math.floor(azar() * 2))),
      gustos: gustos.length ? gustos : ['comida'],
      volveria: calificacion >= 4 ? elegir<OpcionVolveria>([['si', 85], ['tal_vez', 15]]) : elegir<OpcionVolveria>([['tal_vez', 50], ['no', 50]]),
      recomendaria: calificacion >= 4,
      comentario: '',
    };
  });
}