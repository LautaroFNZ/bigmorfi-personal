import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonFooter, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark, closeOutline, pricetagOutline, qrCodeOutline } from 'ionicons/icons';
import { HeaderMarcaComponent } from '../../core/components/header-marca/header-marca.component';
import { NavClienteComponent } from '../../core/components/nav-cliente/nav-cliente.component';
import { CheckAnimadoComponent } from '../../core/components/check-animado/check-animado.component';
import { JuegosService } from '../juegos/juegos.service';
import { JUEGOS, MiCodigo } from '../juegos/juegos.model';
import { formatearDuracion } from '../juegos/formato';
import { vibrarError } from '../juegos/feedback';
import { CuentaService } from './cuenta.service';
import { Cuenta, NIVELES_PROPINA, calcularImportes, formatearPesos, infoPropina } from './cuenta.models';
import { escanearQrPropina } from './qr-propina';

const CONSULTA_CONFIRMACION_MS = 2000; // cada cuánto se fija si el mozo confirmó el pago

/**
 * ============================================================
 *  MÓDULO 4 - Punto 21 - Tu cuenta (pedir cuenta, propina por QR y pago)
 * ============================================================
 *
 * Una sola pantalla que cambia según el estado de la cuenta:
 *  1. consumiendo        → detalle del consumo + "Pedir la cuenta" (push al mozo)
 *  2. pedida sin propina → hay que escanear el QR de propina (sin eso no se arma la cuenta)
 *  3. pedida con propina → detalle estilo Mercado Pago: total grande, descuento,
 *                          propina, código de descuento y "Pagar"
 *  4. pagada             → esperando la confirmación del mozo (Punto 22)
 *  5. confirmada         → pago confirmado, la mesa quedó libre
 *
 * Reemplaza a la maqueta anterior (que elegía la propina con botones).
 */
@Component({
  selector: 'app-cuenta',
  templateUrl: './cuenta.page.html',
  styleUrls: ['./cuenta.page.scss'],
  imports: [RouterLink, IonContent, IonFooter, IonButton, IonIcon, HeaderMarcaComponent, NavClienteComponent, CheckAnimadoComponent],
})
export class CuentaPage {
  private readonly cuentas = inject(CuentaService);
  private readonly juegos = inject(JuegosService);

  readonly niveles = NIVELES_PROPINA;
  readonly pesos = formatearPesos;

  readonly cuenta = signal<Cuenta | null>(null);
  readonly ocupado = signal(false);
  readonly error = signal<string | null>(null);
  readonly sacudir = signal(false);

  // ---- Código de descuento ----
  readonly textoCodigo = signal('');
  readonly errorCodigo = signal<string | null>(null);
  readonly verCodigos = signal(false);
  readonly misCodigos = signal<MiCodigo[]>([]);
  private readonly ahora = signal(Date.now());

  readonly importes = computed(() => {
    const c = this.cuenta();
    return c ? calcularImportes(c) : null;
  });

  readonly propina = computed(() => {
    const p = this.cuenta()?.propina;
    return p ? infoPropina(p) : null;
  });

  /** Nombre del juego que dio el código aplicado (para el detalle). */
  readonly juegoDelCodigo = computed(() => {
    const c = this.cuenta()?.codigo;
    return c ? JUEGOS[c.juego].nombre : '';
  });

  private consulta: ReturnType<typeof setInterval> | null = null;

  constructor() {
    addIcons({ checkmark, closeOutline, pricetagOutline, qrCodeOutline });
    const reloj = setInterval(() => this.ahora.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(reloj);
      this.dejarDeConsultar();
    });
  }

  /** Ionic guarda la pantalla en memoria: recargo la cuenta cada vez que se entra. */
  async ionViewWillEnter() {
    this.cuenta.set(await this.cuentas.obtenerMiCuenta());
    if (this.cuenta()?.estado === 'pagada') this.esperarConfirmacion();
  }

  ionViewWillLeave() {
    this.dejarDeConsultar();
  }

  // ---- Paso 1: pedir la cuenta ----

  async pedirCuenta() {
    await this.ejecutar(() => this.cuentas.pedirCuenta());
  }

  // ---- Paso 2: QR de propina ----

  async escanearPropina() {
    await this.ejecutar(async () => this.cuentas.elegirPropina(await escanearQrPropina()));
  }

  // ---- Paso 3: código de descuento y pago ----

  escribirCodigo(valor: string) {
    this.textoCodigo.set(valor.toUpperCase());
    this.errorCodigo.set(null);
  }

  async aplicarCodigo() {
    if (!this.textoCodigo().trim()) return;
    try {
      this.cuenta.set(await this.cuentas.aplicarCodigo(this.textoCodigo()));
      this.textoCodigo.set('');
      this.errorCodigo.set(null);
    } catch (e) {
      vibrarError();
      this.errorCodigo.set(e instanceof Error ? e.message : 'No se pudo aplicar el código.');
    }
  }

  async quitarCodigo() {
    this.cuenta.set(await this.cuentas.quitarCodigo());
  }

  async abrirMisCodigos() {
    this.misCodigos.set(await this.juegos.obtenerMisCodigos());
    this.verCodigos.set(true);
  }

  cerrarMisCodigos() {
    this.verCodigos.set(false);
  }

  venceEn(codigo: MiCodigo): string {
    return formatearDuracion(codigo.venceEn.getTime() - this.ahora());
  }

  nombreJuego(codigo: MiCodigo): string {
    return JUEGOS[codigo.juego].nombre;
  }

  async pagar() {
    await this.ejecutar(() => this.cuentas.pagar());
    if (this.cuenta()?.estado === 'pagada') this.esperarConfirmacion();
  }

  // ---------------------------------------------------------------------

  /** Corre una acción del servicio; si falla, muestra el error, vibra y sacude. */
  private async ejecutar(accion: () => Promise<Cuenta>) {
    this.ocupado.set(true);
    this.error.set(null);
    try {
      this.cuenta.set(await accion());
    } catch (e) {
      vibrarError();
      this.error.set(e instanceof Error ? e.message : 'Algo salió mal. Probá de nuevo.');
      this.sacudir.set(true);
      setTimeout(() => this.sacudir.set(false), 400);
    } finally {
      this.ocupado.set(false);
    }
  }

  /**
   * Mientras espera al mozo, consulta cada 2 segundos si ya confirmó.
   * (Con backend esto se reemplaza por la push notification o Realtime.)
   */
  private esperarConfirmacion() {
    this.dejarDeConsultar();
    this.consulta = setInterval(async () => {
      const actual = await this.cuentas.obtenerMiCuenta();
      if (actual.estado !== 'pagada') {
        this.cuenta.set(actual);
        this.dejarDeConsultar();
      }
    }, CONSULTA_CONFIRMACION_MS);
  }

  private dejarDeConsultar() {
    if (this.consulta) clearInterval(this.consulta);
    this.consulta = null;
  }
}