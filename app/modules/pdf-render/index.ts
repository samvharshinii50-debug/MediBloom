import { requireNativeModule } from 'expo-modules-core';

interface PdfRenderModule {
  renderPages(uri: string, scale: number, maxPages: number): Promise<string[]>;
}

/**
 * Rasterises a PDF into PNG page images so on-device OCR can read it.
 * Returns `null` when the native module isn't present in this build, so callers
 * can fall back rather than crash.
 */
function load(): PdfRenderModule | null {
  try {
    return requireNativeModule<PdfRenderModule>('PdfRender');
  } catch {
    return null;
  }
}

let cached: PdfRenderModule | null | undefined;

export function isPdfRenderAvailable(): boolean {
  if (cached === undefined) cached = load();
  return cached !== null;
}

export async function renderPdfPages(
  uri: string,
  scale = 2,
  maxPages = 5,
): Promise<string[]> {
  if (cached === undefined) cached = load();
  if (!cached) return [];
  try {
    return await cached.renderPages(uri, scale, maxPages);
  } catch {
    return [];
  }
}
