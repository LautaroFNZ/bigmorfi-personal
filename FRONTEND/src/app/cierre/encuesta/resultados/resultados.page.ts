import { Component, computed, inject, signal } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { ChartConfiguration, Plugin } from 'chart.js';
import { HeaderMarcaComponent } from '../../../core/components/header-marca/header-marca.component';
import { GraficoComponent } from '../grafico/grafico.component';
import { EncuestaService } from '../encuesta.service';
import { OPCIONES_GUSTO, OPCIONES_VOLVERIA, ResumenEncuestas } from '../encuesta.models';

// Colores de la torta: validados para que se distingan entre sí (también
// con daltonismo) y contra el fondo oscuro de la tarjeta.
const COLORES_VOLVERIA = { si: '#C98400', tal_vez: '#3B8FD9', no: '#D9607A' } as const;
const AMBAR = '#F5A400';
const FONDO_TARJETA = '#2A1E14';
const GRILLA = 'rgba(245, 164, 0, 0.12)';
const TEXTO_CLARO = '#F7EFE2';
const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

type Pestana = 'volverian' | 'gustos' | 'calificacion';

const PESTANAS: { id: Pestana; texto: string }[] = [
  { id: 'volverian', texto: 'Volverían' },
  { id: 'gustos', texto: 'Lo mejor' },
  { id: 'calificacion', texto: 'Calificación' },
];

/** Escribe el valor al final de cada barra (para no depender solo del eje). */
const etiquetasEnBarras: Plugin<'bar'> = {
  id: 'etiquetasEnBarras',
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = "700 12px 'Montserrat', sans-serif";
    ctx.fillStyle = TEXTO_CLARO;
    ctx.textBaseline = 'middle';
    chart.getDatasetMeta(0).data.forEach((barra, i) => {
      const valor = chart.data.datasets[0].data[i] as number;
      ctx.fillText(String(valor), barra.x + 6, barra.y);
    });
    ctx.restore();
  },
};

/**
 * ============================================================
 *  MÓDULO 4 - Punto 20 - Resultados de las encuestas
 * ============================================================
 *
 * Tres gráficos, UNO POR PANTALLA (requisito excluyente):
 *  1. Torta  → ¿Volverían?            (opción única)
 *  2. Barras → Lo que más les gustó   (opciones múltiples)
 *  3. Línea  → Calificación por día   (estrellas)
 *
 * Se pasa de uno a otro con las pestañas de arriba o deslizando el dedo.
 * La ven los clientes: al terminar su encuesta, desde la lista de espera
 * (Punto 9) y después de pagar (Punto 22).
 */
@Component({
  selector: 'app-resultados-encuesta',
  templateUrl: './resultados.page.html',
  styleUrls: ['./resultados.page.scss'],
  imports: [IonContent, HeaderMarcaComponent, GraficoComponent],
})
export class ResultadosPage {
  private readonly encuestas = inject(EncuestaService);

  readonly pestanas = PESTANAS;
  readonly colores = COLORES_VOLVERIA;

  readonly resumen = signal<ResumenEncuestas | null>(null);
  readonly activa = signal(0);

  private inicioToque: { x: number; y: number } | null = null;

  /** Leyenda de la torta con porcentaje (así no depende solo del color). */
  readonly leyendaVolveria = computed(() => {
    const r = this.resumen();
    if (!r) return [];
    const total = Object.values(r.volveria).reduce((a, b) => a + b, 0) || 1;
    return OPCIONES_VOLVERIA.map((o) => ({
      texto: o.texto,
      color: COLORES_VOLVERIA[o.valor],
      porcentaje: Math.round((r.volveria[o.valor] / total) * 100),
    }));
  });

  readonly promedioSemanaTexto = computed(() => {
    const p = this.resumen()?.promedioSemana;
    return p === null || p === undefined ? '-' : p.toFixed(1).replace('.', ',');
  });

  readonly configTorta = computed<ChartConfiguration<'doughnut'> | null>(() => {
    const r = this.resumen();
    if (!r) return null;
    return {
      type: 'doughnut',
      data: {
        labels: OPCIONES_VOLVERIA.map((o) => o.texto),
        datasets: [
          {
            data: OPCIONES_VOLVERIA.map((o) => r.volveria[o.valor]),
            backgroundColor: OPCIONES_VOLVERIA.map((o) => COLORES_VOLVERIA[o.valor]),
            borderColor: FONDO_TARJETA, // separación entre porciones
            borderWidth: 3,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        cutout: '58%',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.parsed} respuestas` } },
        },
      },
    };
  });

  readonly configBarras = computed<ChartConfiguration<'bar'> | null>(() => {
    const r = this.resumen();
    if (!r) return null;
    // De mayor a menor, así se lee como un ranking.
    const ordenadas = [...OPCIONES_GUSTO].sort((a, b) => r.gustos[b.valor] - r.gustos[a.valor]);
    return {
      type: 'bar',
      data: {
        labels: ordenadas.map((o) => o.texto),
        datasets: [{ data: ordenadas.map((o) => r.gustos[o.valor]), backgroundColor: AMBAR, borderRadius: 4, barThickness: 22 }],
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        layout: { padding: { right: 28 } },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (c) => ` Elegido ${c.parsed.x} veces` } },
        },
        scales: {
          x: { beginAtZero: true, grid: { color: GRILLA }, border: { display: false }, ticks: { precision: 0 } },
          y: { grid: { display: false }, border: { display: false }, ticks: { color: TEXTO_CLARO, font: { weight: 600 } } },
        },
      },
      plugins: [etiquetasEnBarras],
    };
  });

  readonly configLinea = computed<ChartConfiguration<'line'> | null>(() => {
    const r = this.resumen();
    if (!r) return null;
    return {
      type: 'line',
      data: {
        labels: r.calificacionPorDia.map((d) => DIAS_CORTOS[d.fecha.getDay()]),
        datasets: [
          {
            data: r.calificacionPorDia.map((d) => d.promedio),
            borderColor: AMBAR,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: AMBAR,
            pointBorderColor: FONDO_TARJETA,
            pointBorderWidth: 2,
            tension: 0.3,
            spanGaps: true, // si un día no hubo encuestas, la línea sigue
            fill: true,
            backgroundColor: 'rgba(245, 164, 0, 0.12)',
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (c) => (c.parsed.y === null ? ' Sin encuestas' : ` Promedio: ${c.parsed.y.toFixed(1).replace('.', ',')} estrellas`),
            },
          },
        },
        scales: {
          y: { min: 1, max: 5, ticks: { stepSize: 1 }, grid: { color: GRILLA }, border: { display: false } },
          x: { grid: { display: false }, border: { display: false } },
        },
      },
    };
  });

  /** Ionic guarda la pantalla en memoria: recargo los datos cada vez que se entra. */
  async ionViewWillEnter() {
    this.resumen.set(await this.encuestas.obtenerResumen());
  }

  irA(indice: number) {
    this.activa.set(Math.max(0, Math.min(PESTANAS.length - 1, indice)));
  }

  // ---- Deslizar con el dedo para cambiar de gráfico ----

  empezarToque(e: TouchEvent) {
    const t = e.changedTouches[0];
    this.inicioToque = { x: t.clientX, y: t.clientY };
  }

  terminarToque(e: TouchEvent) {
    if (!this.inicioToque) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this.inicioToque.x;
    const dy = t.clientY - this.inicioToque.y;
    this.inicioToque = null;
    // Solo cuenta como deslizar si fue claramente horizontal.
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      this.irA(this.activa() + (dx < 0 ? 1 : -1));
    }
  }
}