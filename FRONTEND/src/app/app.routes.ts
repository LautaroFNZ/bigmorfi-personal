import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';

export const routes: Routes = [
  {
    // Primera pantalla al abrir la app: logo + slogan + animación, y
    // navega sola al login. Identidad de marca, no pide nada al backend.
    path: 'splash',
    loadComponent: () => import('./splash/splash.page').then((m) => m.SplashPage),
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    redirectTo: 'splash',
    pathMatch: 'full'
  },
  {
    path: 'cuenta-no-habilitada',
    loadComponent: () =>
      import('./shared/pages/cuenta-no-habilitada/cuenta-no-habilitada.page').then(
        (m) => m.CuentaNoHabilitadaPage,
      ),
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./home/home.page').then((m) => m.HomePage),
  },
  {
    path: 'empleados/alta',
    loadComponent: () => import('./empleados/alta-empleado/alta-empleado.page').then( m => m.AltaEmpleadoPage)
  },
  {
    path: 'clientes/registro',
    loadComponent: () => import('./clientes/registro-cliente/registro-cliente.page').then( m => m.RegistroClientePage)
  },
  {
    path: 'clientes/pendientes',
    loadComponent: () => import('./clientes/clientes-pendientes/clientes-pendientes.page').then( m => m.ClientesPendientesPage)
  },

  // ===== Módulo 2 - Catálogo, Mesas y Sectores (Tobi) =====
  // El control de rol lo hace el backend con @Auth(); acá no se pone guard
  // para seguir el mismo criterio que las rutas del Módulo 1.
  {
    // Punto 2 - alta de plato (cocinero)
    path: 'catalogo/platos/alta',
    loadComponent: () => import('./catalogo/alta-plato/alta-plato.page').then((m) => m.AltaPlatoPage),
  },
  {
    // Punto 3 - alta de bebida (cantinero)
    path: 'catalogo/bebidas/alta',
    loadComponent: () => import('./catalogo/alta-bebida/alta-bebida.page').then((m) => m.AltaBebidaPage),
  },
  {
    // Alta de postre (cocinero) - agregado a pedido del equipo, lo exige el TP
    path: 'catalogo/postres/alta',
    loadComponent: () => import('./catalogo/alta-postre/alta-postre.page').then((m) => m.AltaPostrePage),
  },
  {
    // Punto 4 - alta de mesa + QR (dueño / supervisor)
    path: 'catalogo/mesas/alta',
    loadComponent: () => import('./catalogo/alta-mesa/alta-mesa.page').then((m) => m.AltaMesaPage),
  },
  {
    // Punto 16 - sector cocina (cocinero)
    path: 'catalogo/cocina',
    loadComponent: () => import('./catalogo/cocina/cocina.page').then((m) => m.CocinaPage),
  },
  {
    // Punto 17 - sector bar (cantinero)
    path: 'catalogo/bar',
    loadComponent: () => import('./catalogo/bar/bar.page').then((m) => m.BarPage),
  },

  // ===== MOCKUPS VISUALES - Módulo 3 (Nahue) =====
  // Sin funcionalidad real todavía (datos de ejemplo hardcodeados en cada
  // .page.ts). Ver detalle en cada archivo. Nahue reemplaza la lógica
  // interna sin tener que tocar el diseño.
  {
    // Punto 9 - escanear QR de ingreso al local
    path: 'sala/escaneo-qr/ingreso',
    loadComponent: () => import('./sala/escaneo-qr/escaneo-qr.page').then((m) => m.EscaneoQrPage),
    data: { modo: 'ingreso' },
  },
  {
    // Punto 10 - escanear QR de la mesa asignada
    path: 'sala/escaneo-qr/mesa',
    loadComponent: () => import('./sala/escaneo-qr/escaneo-qr.page').then((m) => m.EscaneoQrPage),
    data: { modo: 'mesa' },
  },
  {
    // Punto 9 - bienvenida post-QR de ingreso
    path: 'sala/bienvenida',
    loadComponent: () => import('./sala/bienvenida/bienvenida.page').then((m) => m.BienvenidaPage),
  },
  {
    // Punto 9 - registro rápido del cliente anónimo (foto + nombre)
    path: 'sala/registro-anonimo',
    loadComponent: () =>
      import('./sala/registro-anonimo/registro-anonimo.page').then((m) => m.RegistroAnonimoPage),
  },
  {
    // Punto 9/10 - pantalla de espera del cliente
    path: 'sala/lista-espera',
    loadComponent: () => import('./sala/lista-espera/lista-espera.page').then((m) => m.ListaEsperaPage),
  },
  {
    // Punto 10 - el metre asigna mesas (usa mesas REALES del Módulo 2)
    path: 'sala/metre',
    loadComponent: () =>
      import('./sala/metre-lista-espera/metre-lista-espera.page').then((m) => m.MetreListaEsperaPage),
  },
  {
    // Puntos 11 y 12 - carta del cliente + armado de pedido
    path: 'sala/carta',
    loadComponent: () => import('./sala/carta/carta.page').then((m) => m.CartaPage),
  },
  {
    // Punto 11 - chat con el mozo
    path: 'sala/chat',
    loadComponent: () => import('./sala/chat/chat.page').then((m) => m.ChatPage),
  },
  {
    // Puntos 13, 14, 18 y 19 - seguimiento del pedido (cliente)
    path: 'sala/estado-pedido',
    loadComponent: () =>
      import('./sala/estado-pedido/estado-pedido.page').then((m) => m.EstadoPedidoPage),
  },
  {
    // Puntos 13, 14 y 19 - confirmar/rechazar/entregar pedidos (mozo)
    path: 'sala/mozo',
    loadComponent: () => import('./sala/mozo-pedidos/mozo-pedidos.page').then((m) => m.MozoPedidosPage),
  },

  // ===== MOCKUPS VISUALES - Módulo 4 (Lauti Fernandez), sin juegos =====
  {
    // Punto 20 - encuesta de satisfacción con gráficos
    path: 'cierre/encuesta',
    loadComponent: () => import('./cierre/encuesta/encuesta.page').then((m) => m.EncuestaPage),
  },
  {
    // Punto 20 - resultados de las encuestas: torta, barras y línea (un gráfico por pantalla)
    path: 'cierre/encuesta/resultados',
    loadComponent: () => import('./cierre/encuesta/resultados/resultados.page').then((m) => m.ResultadosPage),
  },
  {
    // Punto 21 - cuenta + QR de propina
    path: 'cierre/cuenta',
    loadComponent: () => import('./cierre/cuenta/cuenta.page').then((m) => m.CuentaPage),
  },
  {
    // Punto 22 - el mozo confirma el pago y se libera la mesa
    path: 'cierre/pagos',
    loadComponent: () => import('./cierre/pagos/pagos.page').then((m) => m.PagosPage),
  },
  {
    // Punto 15 - Juegos: la sección y cada juego (ver cierre/juegos/juegos.routes.ts)
    path: 'cierre/juegos',
    loadChildren: () => import('./cierre/juegos/juegos.routes').then((m) => m.JUEGOS_ROUTES),
  },
  {
    path: '**',
    redirectTo: 'splash',
  },

];
