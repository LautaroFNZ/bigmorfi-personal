import { Component, DestroyRef, ElementRef, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { IonButton, IonContent } from '@ionic/angular';
import { HeaderMarcaComponent } from '../../../core/components/header-marca/header-marca.component';
import { ResultadoJuegoComponent } from '../resultado/resultado-juego.component';
import { JuegosService } from '../juegos.service';
import { CodigoDescuento, JUEGOS, RUTA_VOLVER_JUEGOS } from '../juegos.model';
import { vibrarError } from '../feedback';
import { PALABRAS_AHORCADO } from './palabras';

const VIDAS = 6; // cabeza, cuerpo, 2 brazos y 2 piernas
const COSTO_ARRIESGAR = 2; // vidas que se pierden si se arriesga mal la palabra
const PAUSA_REVELACION_MS = 1500; // tiempo para ver la palabra completa
const TECLADO = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ'.split('');

type Fase = 'intro' | 'jugando' | 'revelando' | 'resultado';

interface CasillaLetra {
  original: string; // como se muestra (con tilde si tiene)
  base: string; // como se compara (sin tilde)
  espacio: boolean;
}

/**
 * ============================================================
 *  MÓDULO 4 - Punto 15 - Ahorcado (15%)
 * ============================================================
 *
 * Una palabra gastronómica al azar, con su categoría como pista.
 * 6 vidas: cada letra que no está suma una parte al dibujo (y vibra).
 * Gana si destapa la palabra completa antes de quedarse sin vidas.
 *
 * "Arriesgar palabra": si ya la sabe, la escribe entera. Si acierta, gana;
 * si no, pierde COSTO_ARRIESGAR vidas (así arriesgar tiene un precio).
 *
 * Modo con premio: igual que los otros juegos, se abre con ?modo=premio
 * y el intento se consume al empezar.
 */
@Component({
  selector: 'app-ahorcado',
  templateUrl: './ahorcado.page.html',
  styleUrls: ['./ahorcado.page.scss'],
  imports: [IonContent, IonButton, HeaderMarcaComponent, ResultadoJuegoComponent],
})
export class AhorcadoPage implements OnInit {
  /** Llega por la URL: /cierre/juegos/ahorcado?modo=premio */
  readonly modo = input<string>();

  private readonly juegos = inject(JuegosService);

  readonly info = JUEGOS.ahorcado;
  readonly rutaVolver = RUTA_VOLVER_JUEGOS;
  readonly teclado = TECLADO;
  readonly totalVidas = VIDAS;
  readonly indicesVidas = Array.from({ length: VIDAS }, (_, i) => i);

  readonly fase = signal<Fase>('intro');
  readonly cargando = signal(true);
  readonly conPremio = signal(false);
  readonly aviso = signal<string | null>(null);

  readonly palabra = signal('');
  readonly categoria = signal('');
  readonly usadas = signal<string[]>([]);
  readonly sacudir = signal(false);

  // ---- Arriesgar palabra ----
  readonly arriesgando = signal(false);
  readonly textoArriesgado = signal('');
  private readonly arriesgadasMal = signal(0);
  private readonly campoArriesgar = viewChild<ElementRef<HTMLInputElement>>('campoArriesgar');

  readonly gano = signal(false);
  readonly partidaFueConPremio = signal(false);
  readonly codigo = signal<CodigoDescuento | null>(null);

  readonly casillas = computed<CasillaLetra[]>(() =>
    this.palabra()
      .split('')
      .map((c) => ({ original: c, base: letraBase(c), espacio: c === ' ' })),
  );

  /** Letras distintas que hay que adivinar (sin espacios ni tildes). */
  private readonly letrasDeLaPalabra = computed(
    () => new Set(this.casillas().filter((c) => !c.espacio).map((c) => c.base)),
  );

  /** Letras que no están + las vidas perdidas por arriesgar mal (nunca más de VIDAS). */
  readonly errores = computed(() =>
    Math.min(VIDAS, this.usadas().filter((l) => !this.letrasDeLaPalabra().has(l)).length + this.arriesgadasMal() * COSTO_ARRIESGAR),
  );
  readonly vidasRestantes = computed(() => VIDAS - this.errores());

  readonly avisoCosto = computed(() =>
    this.vidasRestantes() <= COSTO_ARRIESGAR
      ? 'Si no es la palabra, perdés la partida'
      : `Si no es la palabra, perdés ${COSTO_ARRIESGAR} vidas`,
  );

  readonly subtitulo = computed(() => {
    const premio = this.fase() === 'resultado' || this.fase() === 'revelando' ? this.partidaFueConPremio() : this.conPremio();
    return premio ? `Con premio · ${this.info.porcentaje}%` : 'Juego libre';
  });

  readonly detalleResultado = computed(() =>
    this.gano()
      ? `Adivinaste "${this.palabra()}" con ${this.vidasRestantes()} ${this.vidasRestantes() === 1 ? 'vida' : 'vidas'} de sobra.`
      : `La palabra era "${this.palabra()}".`,
  );

  private pausa: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.pausa) clearTimeout(this.pausa);
    });
  }

  async ngOnInit() {
    if (this.modo() === 'premio') {
      const estado = await this.juegos.obtenerEstado();
      if (!estado.intentoDisponible) {
        this.aviso.set('Ya usaste tu intento con premio. Esta partida es libre.');
      } else if (estado.juegoConPremio !== 'ahorcado') {
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
        await this.juegos.iniciarIntento('ahorcado');
      } catch (e) {
        this.conPremio.set(false);
        this.aviso.set(e instanceof Error ? e.message : 'No se pudo iniciar la partida con premio.');
        return;
      }
    }

    const elegida = PALABRAS_AHORCADO[Math.floor(Math.random() * PALABRAS_AHORCADO.length)];
    this.partidaFueConPremio.set(this.conPremio());
    this.palabra.set(elegida.palabra.toUpperCase());
    this.categoria.set(elegida.categoria);
    this.usadas.set([]);
    this.arriesgadasMal.set(0);
    this.cerrarArriesgar();
    this.gano.set(false);
    this.codigo.set(null);
    this.fase.set('jugando');
  }

  /** Después de una partida, se vuelve a jugar siempre en modo libre. */
  jugarDeNuevo() {
    this.conPremio.set(false);
    this.aviso.set(null);
    this.empezar();
  }

  /** ¿La casilla ya se destapó? (los espacios siempre se ven) */
  destapada(casilla: CasillaLetra): boolean {
    return casilla.espacio || this.fase() !== 'jugando' || this.usadas().includes(casilla.base);
  }

  estadoTecla(letra: string): 'libre' | 'acierto' | 'error' {
    if (!this.usadas().includes(letra)) return 'libre';
    return this.letrasDeLaPalabra().has(letra) ? 'acierto' : 'error';
  }

  elegir(letra: string) {
    if (this.fase() !== 'jugando' || this.usadas().includes(letra)) return;
    this.usadas.update((u) => [...u, letra]);

    if (!this.letrasDeLaPalabra().has(letra)) {
      vibrarError();
      this.sacudir.set(true);
      setTimeout(() => this.sacudir.set(false), 400);
    }

    const completa = [...this.letrasDeLaPalabra()].every((l) => this.usadas().includes(l));
    if (completa || this.vidasRestantes() <= 0) this.revelar(completa);
  }

  abrirArriesgar() {
    if (this.fase() !== 'jugando') return;
    this.arriesgando.set(true);
    // Espero a que el campo aparezca en pantalla para ponerle el foco (abre el teclado).
    setTimeout(() => this.campoArriesgar()?.nativeElement.focus(), 50);
  }

  cerrarArriesgar() {
    this.arriesgando.set(false);
    this.textoArriesgado.set('');
  }

  escribirArriesgado(valor: string) {
    this.textoArriesgado.set(valor.toUpperCase());
  }

  enviarArriesgado() {
    const intento = normalizarPalabra(this.textoArriesgado());
    if (this.fase() !== 'jugando' || !intento) return;

    this.cerrarArriesgar();

    if (intento === normalizarPalabra(this.palabra())) {
      this.revelar(true);
      return;
    }

    this.arriesgadasMal.update((n) => n + 1);
    vibrarError();
    this.sacudir.set(true);
    setTimeout(() => this.sacudir.set(false), 400);
    if (this.vidasRestantes() <= 0) this.revelar(false);
  }

  // ---------------------------------------------------------------------

  /** Muestra la palabra completa un momento y pasa al resultado. */
  private revelar(gano: boolean) {
    this.gano.set(gano);
    this.fase.set('revelando');
    this.pausa = setTimeout(() => this.terminar(gano), PAUSA_REVELACION_MS);
  }

  private async terminar(gano: boolean) {
    if (this.partidaFueConPremio()) {
      try {
        this.codigo.set(await this.juegos.finalizarIntento('ahorcado', gano));
      } catch {
        this.codigo.set(null);
      }
      this.conPremio.set(false);
    }
    this.fase.set('resultado');
  }
}

/** Para comparar lo que escribió: sin tildes, en mayúsculas y con un solo espacio entre palabras. */
function normalizarPalabra(texto: string): string {
  return texto
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .split('')
    .map(letraBase)
    .join('');
}

/** Saca la tilde ("Á" → "A") pero respeta la Ñ, que es otra letra. */
function letraBase(c: string): string {
  if (c === 'Ñ') return 'Ñ';
  return c.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}