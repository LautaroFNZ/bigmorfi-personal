import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular';
import { HeaderMarcaComponent } from '../../../core/components/header-marca/header-marca.component';
import { ResultadoJuegoComponent } from '../resultado/resultado-juego.component';
import { JuegosService } from '../juegos.service';
import { CodigoDescuento, JUEGOS, RUTA_VOLVER_JUEGOS } from '../juegos.model';
import { vibrarError } from '../feedback';
import { PREGUNTAS_TRIVIA } from './preguntas';

const CANTIDAD_PREGUNTAS = 3;
const SEGUNDOS_POR_PREGUNTA = 15;
const SEGUNDOS_ALERTA = 5; // debajo de esto la barra se pone roja
const PAUSA_TRAS_RESPONDER_MS = 1100; // tiempo para ver si acertó antes de seguir

type Fase = 'intro' | 'jugando' | 'resultado';

interface PreguntaEnJuego {
  texto: string;
  opciones: string[];
  correcta: number;
}

/**
 * ============================================================
 *  MÓDULO 4 - Punto 15 - Trivia gastronómica (10%)
 * ============================================================
 *
 * 3 preguntas al azar, 15 segundos cada una. Hay que acertar las tres:
 * con el primer error o si se acaba el tiempo, la partida termina.
 *
 * Modo con premio: se abre con ?modo=premio (lo manda la sección Juegos).
 * Si al entrar el cliente no tiene intento disponible, o el premio de hoy
 * es otro juego, la partida pasa a ser libre y se le avisa.
 *
 * El proyecto es zoneless: todo lo que cambia con el tiempo (reloj,
 * pregunta actual) está en signals para que la pantalla se actualice sola.
 */
@Component({
  selector: 'app-trivia',
  templateUrl: './trivia.page.html',
  styleUrls: ['./trivia.page.scss'],
  imports: [IonContent, IonButton, HeaderMarcaComponent, ResultadoJuegoComponent],
})
export class TriviaPage implements OnInit {
  /** Llega por la URL: /cierre/juegos/trivia?modo=premio */
  readonly modo = input<string>();

  private readonly juegos = inject(JuegosService);

  readonly info = JUEGOS.trivia;
  readonly rutaVolver = RUTA_VOLVER_JUEGOS;
  readonly cantidadPreguntas = CANTIDAD_PREGUNTAS;
  readonly segundosPorPregunta = SEGUNDOS_POR_PREGUNTA;
  readonly letras = ['A', 'B', 'C', 'D'];

  readonly fase = signal<Fase>('intro');
  readonly cargando = signal(true);
  readonly conPremio = signal(false);
  readonly aviso = signal<string | null>(null);

  readonly preguntas = signal<PreguntaEnJuego[]>([]);
  readonly indice = signal(0);
  readonly elegida = signal<number | null>(null);
  readonly restanteMs = signal(SEGUNDOS_POR_PREGUNTA * 1000);
  readonly sacudir = signal(false);

  readonly gano = signal(false);
  readonly partidaFueConPremio = signal(false);
  readonly codigo = signal<CodigoDescuento | null>(null);

  readonly pregunta = computed(() => this.preguntas()[this.indice()]);
  readonly respondida = computed(() => this.elegida() !== null || this.restanteMs() <= 0);
  readonly tiempoAgotado = computed(() => this.elegida() === null && this.restanteMs() <= 0);
  readonly fraccionTiempo = computed(() => this.restanteMs() / (SEGUNDOS_POR_PREGUNTA * 1000));
  readonly segundosRestantes = computed(() => Math.ceil(this.restanteMs() / 1000));
  readonly tiempoEnAlerta = computed(() => this.restanteMs() <= SEGUNDOS_ALERTA * 1000);
  readonly subtitulo = computed(() => {
    const premio = this.fase() === 'resultado' ? this.partidaFueConPremio() : this.conPremio();
    return premio ? `Con premio · ${this.info.porcentaje}%` : 'Juego libre';
  });

  readonly detalleResultado = computed(() => {
    if (this.gano()) return `Acertaste las ${CANTIDAD_PREGUNTAS} preguntas.`;
    const n = this.indice() + 1;
    return this.tiempoAgotado() ? `Se te acabó el tiempo en la pregunta ${n}.` : `Fallaste la pregunta ${n}.`;
  });

  private reloj: ReturnType<typeof setInterval> | null = null;
  private pausa: ReturnType<typeof setTimeout> | null = null;
  private finDePregunta = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detenerTimers());
  }

  async ngOnInit() {
    if (this.modo() === 'premio') {
      const estado = await this.juegos.obtenerEstado();
      if (!estado.intentoDisponible) {
        this.aviso.set('Ya usaste tu intento con premio. Esta partida es libre.');
      } else if (estado.juegoConPremio !== 'trivia') {
        this.aviso.set(`Hoy el premio está en ${JUEGOS[estado.juegoConPremio].nombre}. Esta partida es libre.`);
      } else {
        this.conPremio.set(true);
      }
    }
    this.cargando.set(false);
  }

  async empezar() {
    if (this.conPremio()) {
      try {
        await this.juegos.iniciarIntento('trivia');
      } catch (e) {
        this.conPremio.set(false);
        this.aviso.set(e instanceof Error ? e.message : 'No se pudo iniciar la partida con premio.');
        return;
      }
    }

    this.partidaFueConPremio.set(this.conPremio());
    this.preguntas.set(armarPartida());
    this.indice.set(0);
    this.gano.set(false);
    this.codigo.set(null);
    this.fase.set('jugando');
    this.iniciarPregunta();
  }

  /** Después de una partida, se vuelve a jugar siempre en modo libre. */
  jugarDeNuevo() {
    this.conPremio.set(false);
    this.aviso.set(null);
    this.empezar();
  }

  responder(opcion: number) {
    if (this.respondida()) return; // evita doble toque
    this.elegida.set(opcion);
    this.cerrarPregunta(opcion === this.pregunta().correcta);
  }

  // ---------------------------------------------------------------------

  private iniciarPregunta() {
    this.detenerTimers();
    this.elegida.set(null);
    this.restanteMs.set(SEGUNDOS_POR_PREGUNTA * 1000);
    this.finDePregunta = Date.now() + SEGUNDOS_POR_PREGUNTA * 1000;

    this.reloj = setInterval(() => {
      const restante = Math.max(0, this.finDePregunta - Date.now());
      this.restanteMs.set(restante);
      if (restante === 0) this.cerrarPregunta(false);
    }, 100);
  }

  private cerrarPregunta(acerto: boolean) {
    this.detenerTimers();

    if (!acerto) {
      vibrarError();
      this.sacudir.set(true);
      setTimeout(() => this.sacudir.set(false), 400);
    }

    this.pausa = setTimeout(() => {
      if (!acerto) {
        this.terminar(false);
      } else if (this.indice() === CANTIDAD_PREGUNTAS - 1) {
        this.terminar(true);
      } else {
        this.indice.update((i) => i + 1);
        this.iniciarPregunta();
      }
    }, PAUSA_TRAS_RESPONDER_MS);
  }

  private async terminar(gano: boolean) {
    this.gano.set(gano);

    if (this.partidaFueConPremio()) {
      try {
        this.codigo.set(await this.juegos.finalizarIntento('trivia', gano));
      } catch {
        // Si falla el registro, se muestra el resultado igual pero sin cupón.
        this.codigo.set(null);
      }
      this.conPremio.set(false);
    }

    this.fase.set('resultado');
  }

  private detenerTimers() {
    if (this.reloj) clearInterval(this.reloj);
    if (this.pausa) clearTimeout(this.pausa);
    this.reloj = null;
    this.pausa = null;
  }
}

/** Elige preguntas al azar y mezcla sus opciones. */
function armarPartida(): PreguntaEnJuego[] {
  return mezclar(PREGUNTAS_TRIVIA)
    .slice(0, CANTIDAD_PREGUNTAS)
    .map((p) => {
      const opciones = mezclar(p.opciones.map((texto, i) => ({ texto, esCorrecta: i === p.correcta })));
      return {
        texto: p.texto,
        opciones: opciones.map((o) => o.texto),
        correcta: opciones.findIndex((o) => o.esCorrecta),
      };
    });
}

/** Copia mezclada de un array (Fisher-Yates). */
function mezclar<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}