import { Routes } from '@angular/router';

/**
 * Rutas de la sección Juegos (Módulo 4 - Punto 15).
 * Se cargan desde app.routes.ts con loadChildren bajo 'cierre/juegos'.
 *
 * Sin componente padre a propósito: cada juego se muestra como pantalla
 * completa en el <ion-router-outlet> principal, con la transición y el
 * botón "volver" normales de Ionic.
 */
export const JUEGOS_ROUTES: Routes = [
  {
    // /cierre/juegos - juego del día, contador y cupón
    path: '',
    loadComponent: () => import('./juegos.page').then((m) => m.JuegosPage),
  },
  {
    // /cierre/juegos/trivia - Trivia gastronómica (10%). Con premio: ?modo=premio
    path: 'trivia',
    loadComponent: () => import('./trivia/trivia.page').then((m) => m.TriviaPage),
  },
  {
    path: 'cronometro',
    loadComponent: () => import('./cronometro/cronometro.page').then((m) => m.CronometroPage),
  },
  {
    path: 'ahorcado',
    loadComponent: () => import('./ahorcado/ahorcado.page').then((m) => m.AhorcadoPage),
  }
];