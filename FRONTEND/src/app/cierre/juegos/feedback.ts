/**
 * Único punto de vibración del Módulo 4 (la consigna exige vibrar ante errores).
 *
 * PROVISORIO: usa la vibración del navegador, que anda en Android pero no en
 * iOS. Cuando el grupo instale @capacitor/haptics, se reemplaza el cuerpo por:
 *
 *   import { Haptics, NotificationType } from '@capacitor/haptics';
 *   Haptics.notification({ type: NotificationType.Error });
 *
 * y todos los juegos pasan a usarlo sin tocar nada más.
 */
export function vibrarError(): void {
  try {
    navigator.vibrate?.([80, 60, 120]);
  } catch {
    // Algunos navegadores bloquean la vibración: no es un error del juego.
  }
}