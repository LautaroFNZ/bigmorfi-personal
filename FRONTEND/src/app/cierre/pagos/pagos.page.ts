import { Component, DestroyRef, inject, signal } from '@angular/core';
import { IonButton, IonContent, ToastController } from '@ionic/angular';
import { HeaderMarcaComponent } from '../../core/components/header-marca/header-marca.component';
import { CuentaService } from '../cuenta/cuenta.service';
import { Cuenta, calcularImportes, formatearPesos, infoPropina } from '../cuenta/cuenta.models';
import { vibrarError } from '../juegos/feedback';

const ACTUALIZAR_CADA_MS = 3000;

/**
 * ============================================================
 *  MÓDULO 4 - Punto 22 - Pagos (pantalla del mozo)
 * ============================================================
 *
 * Arriba, las mesas que ya pagaron y esperan confirmación: el mozo toca
 * "Confirmar pago y liberar mesa" → se avisa al dueño y al supervisor y la
 * mesa queda libre (el cliente tiene que volver a escanear el QR de mesa).
 * Abajo, las mesas que pidieron la cuenta pero todavía no pagaron.
 *
 * La lista se actualiza sola cada 3 segundos (con backend se reemplaza por
 * la push notification o Realtime).
 */
@Component({
  selector: 'app-pagos',
  templateUrl: './pagos.page.html',
  styleUrls: ['./pagos.page.scss'],
  imports: [IonContent, IonButton, HeaderMarcaComponent],
})
export class PagosPage {
  private readonly cuentas = inject(CuentaService);
  private readonly toast = inject(ToastController);

  readonly pesos = formatearPesos;
  readonly porConfirmar = signal<Cuenta[]>([]);
  readonly sinPagar = signal<Cuenta[]>([]);
  readonly confirmando = signal<number | null>(null);
  private readonly ahora = signal(Date.now());

  private intervalo: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detener());
  }

  async ionViewWillEnter() {
    await this.cargar();
    this.detener();
    this.intervalo = setInterval(() => this.cargar(), ACTUALIZAR_CADA_MS);
  }

  ionViewWillLeave() {
    this.detener();
  }

  total(c: Cuenta): string {
    return formatearPesos(calcularImportes(c).total);
  }

  propina(c: Cuenta): string {
    if (!c.propina) return 'Sin elegir';
    return `${infoPropina(c.propina).texto} · ${formatearPesos(calcularImportes(c).propina)}`;
  }

  haceCuanto(c: Cuenta): string {
    if (!c.pagadaEn) return '';
    const minutos = Math.floor((this.ahora() - c.pagadaEn.getTime()) / 60000);
    return minutos < 1 ? 'Pagó recién' : `Pagó hace ${minutos} min`;
  }

  async confirmar(c: Cuenta) {
    this.confirmando.set(c.mesaNumero);
    try {
      await this.cuentas.confirmarPago(c.mesaNumero);
      await this.cargar();
      const t = await this.toast.create({
        message: `Pago de la mesa ${c.mesaNumero} confirmado. La mesa quedó libre.`,
        duration: 2500,
        color: 'success',
      });
      await t.present();
    } catch (e) {
      vibrarError();
      const t = await this.toast.create({
        message: e instanceof Error ? e.message : 'No se pudo confirmar el pago.',
        duration: 2500,
        color: 'danger',
      });
      await t.present();
    } finally {
      this.confirmando.set(null);
    }
  }

  private async cargar() {
    const lista = await this.cuentas.listarParaMozo();
    this.ahora.set(Date.now());
    this.porConfirmar.set(lista.filter((c) => c.estado === 'pagada'));
    this.sinPagar.set(lista.filter((c) => c.estado === 'pedida'));
  }

  private detener() {
    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = null;
  }
}