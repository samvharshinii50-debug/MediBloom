package expo.modules.pdfrender

import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

/**
 * Turns PDF pages into PNG files using Android's own PdfRenderer.
 *
 * Deliberately built on the framework API rather than a third-party library:
 * nothing to go stale, nothing extra to ship, and it works offline. The PNGs
 * land in cache so ML Kit can read them, then Android reclaims them.
 */
class PdfRenderModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PdfRender")

    /**
     * Renders every page of `uri` and returns the file:// URIs of the PNGs.
     * `scale` multiplies the page's natural size — 2.0 gives OCR enough pixels
     * to work with on a typical A4 prescription.
     */
    AsyncFunction("renderPages") { uri: String, scale: Double, maxPages: Int ->
      val context = appContext.reactContext ?: throw Exceptions.ReactContextLost()

      val parsed = Uri.parse(uri)
      val descriptor: ParcelFileDescriptor = when (parsed.scheme) {
        "content" ->
          context.contentResolver.openFileDescriptor(parsed, "r")
            ?: throw IllegalArgumentException("Could not open $uri")
        "file", null ->
          ParcelFileDescriptor.open(
            File(parsed.path ?: uri.removePrefix("file://")),
            ParcelFileDescriptor.MODE_READ_ONLY,
          )
        else -> throw IllegalArgumentException("Unsupported URI scheme: ${parsed.scheme}")
      }

      val output = mutableListOf<String>()
      descriptor.use { fd ->
        PdfRenderer(fd).use { renderer ->
          val pageCount = minOf(renderer.pageCount, maxPages)
          for (index in 0 until pageCount) {
            renderer.openPage(index).use { page ->
              val width = (page.width * scale).toInt().coerceAtLeast(1)
              val height = (page.height * scale).toInt().coerceAtLeast(1)
              val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
              // PDFs assume paper; without this, transparent areas read as black
              // and OCR accuracy collapses.
              bitmap.eraseColor(Color.WHITE)
              page.render(bitmap, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)

              val file = File(context.cacheDir, "medibloom-pdf-page-$index-${System.currentTimeMillis()}.png")
              FileOutputStream(file).use { out ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
              }
              bitmap.recycle()
              output.add("file://${file.absolutePath}")
            }
          }
        }
      }
      output
    }
  }
}
