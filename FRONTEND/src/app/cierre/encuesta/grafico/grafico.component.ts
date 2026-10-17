import { Component, DestroyRef, ElementRef, effect, inject, input, viewChild } from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  ChartConfiguration,
  DoughnutController,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';

// Registro solo las piezas de Chart.js que usamos (torta, barras y línea):
// así el paquete final pesa menos que importando todo.
Chart.register(
  DoughnutController,
  ArcElement,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Filler,
  Tooltip,
);

// Tipografía y color de texto de la app para ejes, etiquetas y tooltips.
Chart.defaults.font.family = "'Montserrat', sans-serif";
Chart.defaults.color = 'rgba(232, 197, 138, 0.85)';

/**
 * Envoltorio mínimo de Chart.js para Angular.
 *
 *   <app-grafico [config]="configTorta()" />
 *
 * Crea el gráfico sobre un <canvas> y lo vuelve a crear si cambia la
 * configuración. Al salir de la pantalla lo destruye (libera memoria).
 */
@Component({
  selector: 'app-grafico',
  standalone: true,
  template: `<div class="bm-grafico"><canvas #lienzo></canvas></div>`,
  styles: `
    :host { display: block; }
    .bm-grafico { position: relative; width: 100%; height: 100%; }
  `,
})
export class GraficoComponent {
  readonly config = input.required<ChartConfiguration>();

  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private grafico: Chart | null = null;

  constructor() {
    effect(() => {
      const config = this.config();
      this.grafico?.destroy();
      this.grafico = new Chart(this.lienzo().nativeElement, config);
    });
    inject(DestroyRef).onDestroy(() => this.grafico?.destroy());
  }
}   