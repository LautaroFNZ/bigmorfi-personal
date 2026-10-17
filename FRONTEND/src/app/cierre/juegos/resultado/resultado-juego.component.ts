import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular';
import { CheckAnimadoComponent } from '../../../core/components/check-animado/check-animado.component';
import { CodigoDescuento, RUTA_VOLVER_JUEGOS } from '../juegos.model';
import { formatearDuracion } from '../formato';

/**
 * Pantalla de resultado que comparten los tres juegos.
 *
 *   <app-resultado-juego
 *     [gano]="true" [conPremio]="true" [codigo]="codigo"
 *     detalle="Acertaste las 3 preguntas"
 *     (jugarDeNuevo)="reiniciar()">
 *   </app-resultado-juego>
 *
 * Casos:
 *  - Ganó con premio → cupón con el código y cuánto falta para que venza.
 *  - Ganó jugando libre → felicitación, sin cupón.
 *  - Perdió → mensaje; si era con premio, avisa que el próximo es en 24 h.
 */
@Component({
  selector: 'app-resultado-juego',
  standalone: true,
  imports: [RouterLink, IonButton, CheckAnimadoComponent],
  templateUrl: './resultado-juego.component.html',
  styleUrls: ['./resultado-juego.component.scss'],
})
export class ResultadoJuegoComponent {
  readonly gano = input.required<boolean>();
  readonly conPremio = input.required<boolean>();
  readonly codigo = input<CodigoDescuento | null>(null);
  readonly detalle = input<string>('');
  readonly jugarDeNuevo = output<void>();

  readonly rutaVolver = RUTA_VOLVER_JUEGOS;

  // El reloj de vencimiento se actualiza una vez por segundo.
  private readonly ahora = signal(Date.now());

  readonly tiempoParaVencer = computed(() => {
    const codigo = this.codigo();
    if (!codigo) return '';
    return formatearDuracion(codigo.venceEn.getTime() - this.ahora());
  });

  constructor() {
    const intervalo = setInterval(() => this.ahora.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalo));
  }
}
