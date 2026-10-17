import { BarcodeFormat, BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { NIVELES_PROPINA, NivelPropina } from './cuenta.models';

/**
 * Lectura de los QR de propina (Punto 21).
 *
 * Cada QR impreso tiene adentro un JSON, igual que el QR de mesa del Módulo 2:
 *   {"tipo":"propina","nivel":"excelente","porcentaje":20}
 *
 * Usa el mismo lector que el resto de la app (@capacitor-mlkit/barcode-scanning),
 * así que funciona en el celular Android, no en el navegador de la compu.
 */
export async function escanearQrPropina(): Promise<NivelPropina> {
  const { supported } = await BarcodeScanner.isSupported();
  if (!supported) {
    throw new Error('El lector de QR funciona solo en el celular.');
  }

  const { camera } = await BarcodeScanner.requestPermissions();
  if (camera !== 'granted' && camera !== 'limited') {
    throw new Error('Se necesita permiso de cámara para escanear el QR de propina.');
  }

  const { barcodes } = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode] });
  if (barcodes.length === 0) {
    throw new Error('No se detectó ningún código QR.');
  }

  return interpretarQrPropina(barcodes[0].rawValue ?? '');
}

/** Valida el contenido del QR y devuelve el nivel de propina. */
export function interpretarQrPropina(contenido: string): NivelPropina {
  try {
    const datos = JSON.parse(contenido);
    const nivel = NIVELES_PROPINA.find((n) => n.nivel === datos.nivel && n.porcentaje === datos.porcentaje);
    if (datos.tipo !== 'propina' || !nivel) throw new Error();
    return nivel.nivel;
  } catch {
    throw new Error('Ese QR no es de propina. Escaneá uno de los QR de la mesa.');
  }
}