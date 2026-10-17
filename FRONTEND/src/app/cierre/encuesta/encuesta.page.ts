import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonRange, IonTextarea, IonToggle } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark } from 'ionicons/icons';
import { HeaderMarcaComponent } from '../../core/components/header-marca/header-marca.component';
import { CheckAnimadoComponent } from '../../core/components/check-animado/check-animado.component';
import { EncuestaService } from './encuesta.service';
import { OPCIONES_GUSTO, OPCIONES_VOLVERIA, OpcionGusto, OpcionVolveria } from './encuesta.models';
import { vibrarError } from '../juegos/feedback';

type TipoPaso = 'estrellas' | 'deslizador' | 'multiple' | 'unica' | 'interruptor' | 'texto';

interface Paso {
  tipo: TipoPaso;
  pregunta: string;
  ayuda: string;
}

/** El orden de la encuesta: una pregunta por pantalla, cada una con un control distinto. */
const PASOS: Paso[] = [
  { tipo: 'estrellas', pregunta: '¿Cómo calificás tu experiencia en general?', ayuda: 'Tocá las estrellas' },
  { tipo: 'deslizador', pregunta: '¿Cómo fue la atención del mozo?', ayuda: 'Deslizá de 0 a 10' },
  { tipo: 'multiple', pregunta: '¿Qué fue lo que más te gustó?', ayuda: 'Podés elegir más de una' },
  { tipo: 'unica', pregunta: '¿Volverías a Big Morfi?', ayuda: 'Elegí una opción' },
  { tipo: 'interruptor', pregunta: '¿Nos recomendarías a un amigo?', ayuda: 'Activalo si nos recomendarías' },
  { tipo: 'texto', pregunta: '¿Algo más que quieras contarnos?', ayuda: 'Opcional' },
];

type Estado = 'cargando' | 'respondiendo' | 'enviada' | 'ya_respondida';

/**
 * ============================================================
 *  MÓDULO 4 - Punto 20 - Encuesta de satisfacción (opción B: paso a paso)
 * ============================================================
 *
 * Seis preguntas, una por pantalla, con barra de progreso y botones
 * Atrás / Siguiente. Cada una usa un control distinto: estrellas,
 * deslizador, opciones múltiples, opción única, interruptor y texto libre.
 *
 * Una encuesta por estadía: si el cliente ya la completó, se le muestra
 * un aviso y el acceso a los resultados (gráficos).
 *
 * Reemplaza a la maqueta anterior (que usaba solo estrellas).
 */
@Component({
  selector: 'app-encuesta',
  templateUrl: './encuesta.page.html',
  styleUrls: ['./encuesta.page.scss'],
  imports: [
    RouterLink,
    IonContent,
    IonButton,
    IonIcon,
    IonRange,
    IonToggle,
    IonTextarea,
    HeaderMarcaComponent,
    CheckAnimadoComponent,
  ],
})
export class EncuestaPage implements OnInit {
  private readonly encuestas = inject(EncuestaService);

  readonly pasos = PASOS;
  readonly opcionesGusto = OPCIONES_GUSTO;
  readonly opcionesVolveria = OPCIONES_VOLVERIA;
  readonly estrellas = [1, 2, 3, 4, 5];

  readonly estado = signal<Estado>('cargando');
  readonly indice = signal(0);
  readonly enviando = signal(false);
  readonly error = signal<string | null>(null);
  readonly sacudir = signal(false);

  // ---- Respuestas ----
  readonly calificacion = signal(0);
  readonly atencionMozo = signal(5);
  readonly gustos = signal<OpcionGusto[]>([]);
  readonly volveria = signal<OpcionVolveria | null>(null);
  readonly recomendaria = signal(false);
  readonly comentario = signal('');

  readonly paso = computed(() => PASOS[this.indice()]);
  readonly esUltimo = computed(() => this.indice() === PASOS.length - 1);
  readonly progreso = computed(() => Math.round(((this.indice() + 1) / PASOS.length) * 100));

  /** ¿Se puede avanzar desde la pregunta actual? */
  readonly pasoCompleto = computed(() => {
    switch (this.paso().tipo) {
      case 'estrellas':
        return this.calificacion() > 0;
      case 'multiple':
        return this.gustos().length > 0;
      case 'unica':
        return this.volveria() !== null;
      default:
        return true; // deslizador e interruptor tienen valor inicial; el texto es opcional
    }
  });

  constructor() {
    // Tilde de las opciones múltiples (los demás íconos ya están registrados en core/icons.ts).
    addIcons({ checkmark });
  }

  async ngOnInit() {
    this.estado.set((await this.encuestas.yaRespondio()) ? 'ya_respondida' : 'respondiendo');
  }

  // ---- Controles ----

  puntuar(valor: number) {
    this.calificacion.set(valor);
  }

  cambiarAtencion(valor: unknown) {
    this.atencionMozo.set(Number(valor));
  }

  alternarGusto(opcion: OpcionGusto) {
    this.gustos.update((g) => (g.includes(opcion) ? g.filter((x) => x !== opcion) : [...g, opcion]));
  }

  elegirVolveria(opcion: OpcionVolveria) {
    this.volveria.set(opcion);
  }

  cambiarRecomendaria(valor: boolean) {
    this.recomendaria.set(valor);
  }

  cambiarComentario(valor: string | null | undefined) {
    this.comentario.set(valor ?? '');
  }

  // ---- Navegación ----

  atras() {
    this.error.set(null);
    this.indice.update((i) => Math.max(0, i - 1));
  }

  async siguiente() {
    if (!this.pasoCompleto()) {
      // No avanza: vibra y sacude la tarjeta para marcar que falta responder.
      vibrarError();
      this.sacudir.set(true);
      setTimeout(() => this.sacudir.set(false), 400);
      return;
    }
    if (this.esUltimo()) {
      await this.enviar();
    } else {
      this.indice.update((i) => i + 1);
    }
  }

  private async enviar() {
    this.enviando.set(true);
    this.error.set(null);
    try {
      await this.encuestas.enviar({
        calificacion: this.calificacion(),
        atencionMozo: this.atencionMozo(),
        gustos: this.gustos(),
        volveria: this.volveria()!,
        recomendaria: this.recomendaria(),
        comentario: this.comentario(),
      });
      this.estado.set('enviada');
    } catch (e) {
      vibrarError();
      this.error.set(e instanceof Error ? e.message : 'No se pudo enviar la encuesta. Probá de nuevo.');
    } finally {
      this.enviando.set(false);
    }
  }
}