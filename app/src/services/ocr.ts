import * as FileSystem from 'expo-file-system';
import { renderPdfPages, isPdfRenderAvailable } from '../../modules/pdf-render';

/**
 * On-device text recognition.
 *
 * The real engine is Google ML Kit, which ships with Play Services and runs
 * entirely offline. It is loaded lazily and behind a try/catch because it is a
 * native module: if it is unavailable in this build, OCR degrades to "we
 * couldn't read it, type it in instead" rather than crashing the app.
 */

export interface OcrResult {
  text: string;
  /** Which path produced the text, surfaced in the UI for honesty. */
  source: 'mlkit' | 'unavailable';
  error?: string;
}

type MlKitModule = {
  default: { recognize: (uri: string) => Promise<{ text: string }> };
};

let mlkit: MlKitModule['default'] | null | undefined;

function loadMlKit(): MlKitModule['default'] | null {
  if (mlkit !== undefined) return mlkit;
  try {
    // Resolved at runtime so a missing native module is a caught error,
    // not a bundling failure.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-ml-kit/text-recognition') as MlKitModule;
    mlkit = mod.default ?? null;
  } catch {
    mlkit = null;
  }
  return mlkit;
}

export function isOcrAvailable(): boolean {
  return loadMlKit() !== null;
}

/** PDFs additionally need the page rasteriser. */
export function isPdfSupported(): boolean {
  return isOcrAvailable() && isPdfRenderAvailable();
}

/** Runs text recognition over a local image URI. */
export async function recognizeImage(uri: string): Promise<OcrResult> {
  const engine = loadMlKit();
  if (!engine) {
    return {
      text: '',
      source: 'unavailable',
      error: 'Text recognition is not available in this build.',
    };
  }

  try {
    const result = await engine.recognize(uri);
    return { text: result?.text ?? '', source: 'mlkit' };
  } catch (e) {
    return {
      text: '',
      source: 'unavailable',
      error: e instanceof Error ? e.message : 'Could not read that image.',
    };
  }
}

/**
 * PDFs have to become images before ML Kit can read them.
 * Same lazy-load contract as above.
 */
export async function recognizePdf(uri: string): Promise<OcrResult> {
  // Android's own PdfRenderer turns the pages into images; ML Kit then reads
  // them. Same path for a scanned PDF and a digital one.
  const pages = await renderPdfPages(uri, 2, 5);

  if (pages.length === 0) {
    return {
      text: '',
      source: 'unavailable',
      error: 'Could not open that PDF — try a photo of it instead.',
    };
  }

  const chunks: string[] = [];
  for (const page of pages) {
    const res = await recognizeImage(page);
    if (res.text) chunks.push(res.text);
  }

  return chunks.length > 0
    ? { text: chunks.join('\n'), source: 'mlkit' }
    : { text: '', source: 'unavailable', error: 'No readable text found in that PDF.' };
}

/** Routes to the right reader based on the file extension. */
export async function recognizeFile(uri: string): Promise<OcrResult> {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.pdf')) return recognizePdf(uri);
  return recognizeImage(uri);
}

/**
 * Reads a bundled sample prescription. Used by "Try our sample prescription",
 * which is what makes the demo reliable regardless of camera or lighting.
 */
export async function readBundledSampleText(assetUri: string): Promise<string> {
  try {
    const info = await FileSystem.getInfoAsync(assetUri);
    if (!info.exists) return '';
    return await FileSystem.readAsStringAsync(assetUri);
  } catch {
    return '';
  }
}
