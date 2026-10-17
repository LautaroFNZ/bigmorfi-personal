import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular';
import { HeaderMarcaComponent } from '../../../core/components/header-marca/header-marca.component';
import { ResultadoJuegoComponent } from '../resultado/resultado-juego.component';
import { JuegosService } from '../juegos.service';
import { CodigoDescuento, JUEGOS, RUTA_VOLVER_JUEGOS } from '../juegos.model';
import { vibrarError } from '../feedback';

const OBJETIVO_MIN_MS = 3000; // el objetivo sale al azar entre 3 y 8 segundos
const OBJETIVO_MAX_MS = 8000;
const MARGEN_MS = 150; // ±0,15 s para ganar
const RELOJ_VISIBLE_MS = 1000; // el reloj se ve solo el primer segundo
const LIMITE_EXTRA_MS = 3000; // si no frena 3 s después del objetivo, pierde solo
const PAUSA_REVELACION_MS = 1800; // tiempo para ver en cuánto frenó

type Fase = 'intro' | 'listo' | 'corriendo' | 'revelando' | 'resultado';

/**
 * ============================================================
 *  MÓDULO 4 - Punto 15 - Frená el cronómetro (20%)
 * ============================================================
 *
 * Se muestra un tiempo objetivo distinto en cada partida (entre 3 y 8 s).
 * El cliente toca INICIAR y el reloj arranca; después del primer segundo
 * se oculta. Gana si toca FRENAR a ±0,15 s del objetivo.
 *
 * Modo con premio: igual que la trivia, se abre con ?modo=premio y el
 * intento se consume al empezar.
 *
 * El tiempo se mide con performance.now(), que es preciso al milisegundo
 * y no depende del reloj del sistema.
 */
@Component({
  selector: 'app-cronometro',
  templateUrl: './cronometro.page.html',
  styleUrls: ['./cronometro.page.scss'],
  imports: [IonContent, IonButton, HeaderMarcaComponent, ResultadoJuegoComponent],
})
export class CronometroPage implements OnInit {
  /** Llega por la URL: /cierre/juegos/cronometro?modo=premio */
  readonly modo = input<string>();

  private readonly juegos = inject(JuegosService);

  readonly info = JUEGOS.cronometro;
  readonly rutaVolver = RUTA_VOLVER_JUEGOS;
  readonly margenTexto = formatearSegundos(MARGEN_MS);

  readonly fase = signal<Fase>('intro');
  readonly cargando = signal(true);
  readonly conPremio = signal(false);
  readonly aviso = signal<string | null>(null);

  readonly objetivoMs = signal(0);
  readonly transcurridoMs = signal(0);
  readonly frenoEnMs = signal(0);

  readonly gano = signal(false);
  readonly partidaFueConPremio = signal(false);
  readonly codigo = signal<CodigoDescuento | null>(null);

  readonly objetivoTexto = computed(() => formatearSegundos(this.objetivoMs()));

  /** Lo que muestra el dial según el momento de la partida. */
  readonly textoReloj = computed(() => {
    switch (this.fase()) {
      case 'corriendo':
        return this.transcurridoMs() < RELOJ_VISIBLE_MS ? formatearSegundos(this.transcurridoMs()) : '?,??';
      case 'revelando':
        return formatearSegundos(this.frenoEnMs());
      default:
        return '0,00';
    }
  });

  readonly relojOculto = computed(() => this.fase() === 'corriendo' && this.transcurridoMs() >= RELOJ_VISIBLE_MS);

  /** "+0,06 s" o "-0,21 s" respecto del objetivo. */
  readonly diferenciaTexto = computed(() => {
    const dif = this.frenoEnMs() - this.objetivoMs();
    return `${dif >= 0 ? '+' : '-'}${formatearSegundos(Math.abs(dif))} s`;
  });

  readonly subtitulo = computed(() => {
    const premio = this.fase() === 'resultado' || this.fase() === 'revelando' ? this.partidaFueConPremio() : this.conPremio();
    return premio ? `Con premio · ${this.info.porcentaje}%` : 'Juego libre';
  });

  readonly detalleResultado = computed(
    () => `Frenaste en ${formatearSegundos(this.frenoEnMs())} s. El objetivo era ${this.objetivoTexto()} s (${this.diferenciaTexto()}).`,
  );

  private inicio = 0;
  private reloj: ReturnType<typeof setInterval> | null = null;
  private pausa: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detenerTimers());
  }

  async ngOnInit() {
    if (this.modo() === 'premio') {
      const estado = await this.juegos.obtenerEstado();
      if (!estado.intentoDisponible) {
        this.aviso.set('Ya usaste tu intento con premio. Esta partida es libre.');
      } else if (estado.juegoConPremio !== 'cronometro') {
        this.aviso.set(`Hoy el premio está en ${JUEGOS[estado.juegoConPremio].nombre}. Esta partida es libre.`);
      } else {
        this.conPremio.set(true);
      }
    }
    this.cargando.set(false);
  }

  /** Desde la intro: consume el intento (si es con premio) y prepara el objetivo. */
  async empezar() {
    if (this.conPremio()) {
      try {
        await this.juegos.iniciarIntento('cronometro');
      } catch (e) {
        this.conPremio.set(false);
        this.aviso.set(e instanceof Error ? e.message : 'No se pudo iniciar la partida con premio.');
        return;
      }
    }

    this.partidaFueConPremio.set(this.conPremio());
    this.objetivoMs.set(sortearObjetivo());
    this.transcurridoMs.set(0);
    this.frenoEnMs.set(0);
    this.gano.set(false);
    this.codigo.set(null);
    this.fase.set('listo');
  }

  /** El botón redondo: primero INICIA, después FRENA. */
  tocarBoton() {
    if (this.fase() === 'listo') {
      this.arrancarReloj();
    } else if (this.fase() === 'corriendo') {
      this.frenar(performance.now() - this.inicio);
    }
  }

  /** Después de una partida, se vuelve a jugar siempre en modo libre. */
  jugarDeNuevo() {
    this.conPremio.set(false);
    this.aviso.set(null);
    this.empezar();
  }

  // ---------------------------------------------------------------------

  private arrancarReloj() {
    this.inicio = performance.now();
    this.fase.set('corriendo');

    // Refresco cada ~30 ms: alcanza para que el primer segundo se vea fluido.
    this.reloj = setInterval(() => {
      const transcurrido = performance.now() - this.inicio;
      this.transcurridoMs.set(transcurrido);
      if (transcurrido >= this.objetivoMs() + LIMITE_EXTRA_MS) this.frenar(transcurrido);
    }, 30);
  }

  private frenar(transcurrido: number) {
    this.detenerTimers();
    this.frenoEnMs.set(Math.round(transcurrido));

    const gano = Math.abs(this.frenoEnMs() - this.objetivoMs()) <= MARGEN_MS;
    this.gano.set(gano);
    if (!gano) vibrarError();

    this.fase.set('revelando');
    this.pausa = setTimeout(() => this.terminar(gano), PAUSA_REVELACION_MS);
  }

  private async terminar(gano: boolean) {
    if (this.partidaFueConPremio()) {
      try {
        this.codigo.set(await this.juegos.finalizarIntento('cronometro', gano));
      } catch {
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

/** Objetivo al azar, redondeado a centésimas de segundo. */
function sortearObjetivo(): number {
  const ms = OBJETIVO_MIN_MS + Math.random() * (OBJETIVO_MAX_MS - OBJETIVO_MIN_MS);
  return Math.round(ms / 10) * 10;
}

/** 4370 → "4,37" (con coma decimal, como se escribe en Argentina). */
function formatearSegundos(ms: number): string {
  return (ms / 1000).toFixed(2).replace('.', ',');
}