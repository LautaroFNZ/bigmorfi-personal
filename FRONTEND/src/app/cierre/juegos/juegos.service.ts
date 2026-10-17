import { Service } from '@angular/core';
import { CodigoDescuento, EstadoCodigo, EstadoJuegos, JUEGOS, JuegoId, MiCodigo, ORDEN_ROTACION } from './juegos.model';

const HORAS_ENTRE_INTENTOS = 24;
const HORAS_VIGENCIA_CODIGO = 24;
const MS_POR_HORA = 60 * 60 * 1000;

interface CodigoGuardado extends CodigoDescuento {
  usado: boolean;
}

/**
 * ============================================================
 *  MÓDULO 4 - Juegos (Punto 15) - SERVICIO SIMULADO
 * ============================================================
 *
 * Por ahora guarda todo EN MEMORIA: al recargar la página se reinicia
 * (práctico para probar). Cuando hagamos el backend, solo cambia el
 * interior de estos métodos por llamadas HTTP a la API; las pantallas no
 * se tocan, porque ya trabajan con Promises.
 *
 * El intento con premio se CONSUME AL EMPEZAR la partida (iniciarIntento),
 * no al terminarla. Así, si el cliente ve que va perdiendo y cierra la app,
 * igual perdió su intento y no puede volver a probar suerte.
 *
 * Los códigos ganados quedan en un historial ("Ver mis códigos" de la
 * cuenta). Solo uno puede estar vigente a la vez: el más nuevo, si no se
 * usó ni venció. Se marca como usado cuando el mozo confirma el pago.
 *
 * Pendiente para la etapa de backend:
 *  - Guardar intentos y códigos en Supabase (la hora la pone el servidor,
 *    así no se puede saltear la espera cambiando el reloj del celular).
 *  - Bloquear el premio al cliente anónimo.
 */
@Service()
export class JuegosService {
  private indiceRotacion = 0;
  private ultimoIntento: Date | null = null;
  private intentoEnCurso: JuegoId | null = null;
  private readonly codigos: CodigoGuardado[] = [];

  async obtenerEstado(): Promise<EstadoJuegos> {
    const ahora = Date.now();

    const proximo = this.ultimoIntento
      ? new Date(this.ultimoIntento.getTime() + HORAS_ENTRE_INTENTOS * MS_POR_HORA)
      : null;
    const intentoDisponible = proximo === null || proximo.getTime() <= ahora;

    return {
      juegoConPremio: ORDEN_ROTACION[this.indiceRotacion],
      intentoDisponible,
      proximoIntento: intentoDisponible ? null : proximo,
      codigoActivo: this.codigoVigente(),
    };
  }

  /** Arranca la partida con premio. Tira error si no corresponde. */
  async iniciarIntento(juego: JuegoId): Promise<void> {
    const estado = await this.obtenerEstado();

    if (!estado.intentoDisponible) {
      throw new Error('Ya usaste tu intento con premio. Esta partida es libre.');
    }
    if (estado.juegoConPremio !== juego) {
      throw new Error(`Hoy el premio está en ${JUEGOS[estado.juegoConPremio].nombre}. Esta partida es libre.`);
    }

    this.ultimoIntento = new Date();
    this.intentoEnCurso = juego;
    this.indiceRotacion = (this.indiceRotacion + 1) % ORDEN_ROTACION.length;
  }

  /** Cierra la partida con premio. Si ganó, devuelve el código nuevo. */
  async finalizarIntento(juego: JuegoId, gano: boolean): Promise<CodigoDescuento | null> {
    if (this.intentoEnCurso !== juego) {
      throw new Error('No hay una partida con premio en curso.');
    }
    this.intentoEnCurso = null;

    if (!gano) return null;

    // Un solo código vigente por cliente: el nuevo deja sin efecto al anterior.
    const anterior = this.codigoVigente();
    if (anterior) this.buscar(anterior.codigo)!.usado = true;

    const nuevo: CodigoGuardado = {
      codigo: generarCodigo(),
      porcentaje: JUEGOS[juego].porcentaje,
      juego,
      venceEn: new Date(Date.now() + HORAS_VIGENCIA_CODIGO * MS_POR_HORA),
      usado: false,
    };
    this.codigos.push(nuevo);
    return sinEstado(nuevo);
  }

  // ---- Códigos de descuento (los usa la cuenta, Punto 21) ----

  /** Historial de códigos del cliente, del más nuevo al más viejo. */
  async obtenerMisCodigos(): Promise<MiCodigo[]> {
    return [...this.codigos].reverse().map((c) => ({ ...sinEstado(c), estado: estadoDe(c) }));
  }

  /** Devuelve el código si se puede usar; si no, tira un error con el motivo. */
  async validarCodigo(texto: string): Promise<CodigoDescuento> {
    const codigo = this.buscar(texto.trim().toUpperCase());
    if (!codigo) throw new Error('Ese código no existe o no es tuyo.');

    const estado = estadoDe(codigo);
    if (estado === 'usado') throw new Error('Ese código ya fue usado.');
    if (estado === 'vencido') throw new Error('Ese código venció.');

    return sinEstado(codigo);
  }

  /** Se llama cuando el mozo confirma el pago con ese código. */
  async marcarCodigoUsado(texto: string): Promise<void> {
    const codigo = this.buscar(texto);
    if (codigo) codigo.usado = true;
  }

  // ---------------------------------------------------------------------

  private codigoVigente(): CodigoDescuento | null {
    const ultimo = this.codigos[this.codigos.length - 1];
    return ultimo && estadoDe(ultimo) === 'vigente' ? sinEstado(ultimo) : null;
  }

  private buscar(texto: string): CodigoGuardado | undefined {
    return this.codigos.find((c) => c.codigo === texto);
  }
}

function estadoDe(c: CodigoGuardado): EstadoCodigo {
  if (c.usado) return 'usado';
  return c.venceEn.getTime() <= Date.now() ? 'vencido' : 'vigente';
}

/** Copia sin el campo interno "usado" (las pantallas no lo necesitan). */
function sinEstado(c: CodigoGuardado): CodigoDescuento {
  return { codigo: c.codigo, porcentaje: c.porcentaje, juego: c.juego, venceEn: c.venceEn };
}

/** "MORFI-" + 4 caracteres, sin los que se confunden (0/O, 1/I/L). */
function generarCodigo(): string {
  const caracteres = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let sufijo = '';
  for (let i = 0; i < 4; i++) {
    sufijo += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return `MORFI-${sufijo}`;
}