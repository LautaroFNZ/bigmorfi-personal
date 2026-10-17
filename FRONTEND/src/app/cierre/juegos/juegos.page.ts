import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForward, helpCircleOutline, star, stopwatchOutline, textOutline } from 'ionicons/icons';
import { HeaderMarcaComponent } from '../../core/components/header-marca/header-marca.component';
import { JuegosService } from './juegos.service';
import { EstadoJuegos, InfoJuego, JUEGOS, ORDEN_ROTACION } from './juegos.model';
import { formatearDuracion } from './formato';

/**
 * ============================================================
 *  MÓDULO 4 - Punto 15 - Sección Juegos (opción A: juego del día destacado)
 * ============================================================
 *
 * Arriba, una tarjeta grande con el estado del intento con premio:
 *  - Si está disponible → el juego que da premio hoy y el botón para jugarlo.
 *  - Si ya lo usó → cuenta regresiva hasta el próximo y qué juego le va a tocar.
 * Si ganó un código que sigue vigente, se muestra como cupón con su vencimiento.
 * Abajo, los juegos para jugar libre, sin premio.
 */
@Component({
  selector: 'app-juegos',
  templateUrl: './juegos.page.html',
  styleUrls: ['./juegos.page.scss'],
  imports: [RouterLink, IonContent, IonButton, IonIcon, HeaderMarcaComponent],
})
export class JuegosPage {
  private readonly juegos = inject(JuegosService);

  readonly estado = signal<EstadoJuegos | null>(null);
  private readonly ahora = signal(Date.now());

  readonly juegoDelDia = computed<InfoJuego | null>(() => {
    const estado = this.estado();
    return estado ? JUEGOS[estado.juegoConPremio] : null;
  });

  /** Con intento disponible, el juego del día va arriba y no se repite abajo. */
  readonly juegosLibres = computed<InfoJuego[]>(() => {
    const estado = this.estado();
    const todos = ORDEN_ROTACION.map((id) => JUEGOS[id]);
    if (!estado?.intentoDisponible) return todos;
    return todos.filter((j) => j.id !== estado.juegoConPremio);
  });

  readonly cuentaRegresiva = computed(() => {
    const proximo = this.estado()?.proximoIntento;
    return proximo ? formatearDuracion(proximo.getTime() - this.ahora()) : '';
  });

  readonly vencimientoCodigo = computed(() => {
    const codigo = this.estado()?.codigoActivo;
    return codigo ? formatearDuracion(codigo.venceEn.getTime() - this.ahora()) : '';
  });

  constructor() {
    // Íconos propios de esta sección (así no hace falta tocar core/icons.ts).
    addIcons({
      'help-circle-outline': helpCircleOutline,
      'text-outline': textOutline,
      'stopwatch-outline': stopwatchOutline,
      'chevron-forward': chevronForward,
      star,
    });

    const intervalo = setInterval(() => {
      this.ahora.set(Date.now());
      // Cuando la cuenta regresiva o el código llegan a cero, se refresca el estado.
      const estado = this.estado();
      const llegoElIntento = estado?.proximoIntento && estado.proximoIntento.getTime() <= Date.now();
      const vencioElCodigo = estado?.codigoActivo && estado.codigoActivo.venceEn.getTime() <= Date.now();
      if (llegoElIntento || vencioElCodigo) this.cargarEstado();
    }, 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalo));
  }

  /**
   * Ionic guarda la pantalla en memoria al navegar, así que ngOnInit corre
   * una sola vez. ionViewWillEnter corre CADA vez que se vuelve a esta
   * pantalla (por ejemplo, al volver de un juego recién jugado).
   */
  ionViewWillEnter() {
    this.cargarEstado();
  }

  private async cargarEstado() {
    this.estado.set(await this.juegos.obtenerEstado());
  }
}