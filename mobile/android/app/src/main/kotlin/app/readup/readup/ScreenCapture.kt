package app.readup.readup

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.PixelFormat
import android.graphics.Point
import android.hardware.display.DisplayManager
import android.hardware.display.VirtualDisplay
import android.media.Image
import android.media.ImageReader
import android.media.projection.MediaProjection
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.WindowManager

/**
 * Espelho da tela enquanto a bolha está ligada (a permissão de captura vale para a sessão):
 * guarda o quadro mais recente e só o converte em Bitmap quando a pessoa toca na bolha.
 */
class ScreenCapture(
    context: Context,
    resultCode: Int,
    data: Intent,
    private val onStopped: () -> Unit,
) {
    private val handler = Handler(Looper.getMainLooper())
    private val lock = Any()
    private val projection: MediaProjection
    private val reader: ImageReader
    private val display: VirtualDisplay
    private var latest: Image? = null
    private var released = false

    init {
        val size = screenSize(context)
        val manager = context.getSystemService(MediaProjectionManager::class.java)
        // null quando o aceite já foi usado ou expirou: o FloatService avisa a pessoa
        projection = manager.getMediaProjection(resultCode, data)
            ?: throw IllegalStateException("Captura da tela não liberada")
        // Android 14: o callback precisa vir antes do createVirtualDisplay
        projection.registerCallback(
            object : MediaProjection.Callback() {
                // a pessoa parou a captura pelo sistema (ícone de transmissão)
                override fun onStop() {
                    release()
                    onStopped()
                }
            },
            handler,
        )
        reader = ImageReader.newInstance(size.x, size.y, PixelFormat.RGBA_8888, 3)
        reader.setOnImageAvailableListener({ source ->
            synchronized(lock) {
                latest?.close()
                latest = source.acquireLatestImage()
            }
        }, handler)
        display = projection.createVirtualDisplay(
            "readup-float",
            size.x,
            size.y,
            context.resources.displayMetrics.densityDpi,
            DisplayManager.VIRTUAL_DISPLAY_FLAG_AUTO_MIRROR,
            reader.surface,
            null,
            handler,
        ) ?: run {
            released = true // o onStop disparado pelo stop() não deve mexer no display inexistente
            reader.close()
            projection.stop()
            throw IllegalStateException("Espelho da tela não criado")
        }
    }

    /** O último quadro da tela; null se nenhum chegou ainda. */
    fun capture(): Bitmap? {
        synchronized(lock) {
            val image = latest ?: return null
            val plane = image.planes[0]
            val rowPadding = plane.rowStride - plane.pixelStride * image.width
            val padded = Bitmap.createBitmap(
                image.width + rowPadding / plane.pixelStride,
                image.height,
                Bitmap.Config.ARGB_8888,
            )
            plane.buffer.rewind()
            padded.copyPixelsFromBuffer(plane.buffer)
            if (rowPadding == 0) return padded
            return Bitmap.createBitmap(padded, 0, 0, image.width, image.height)
                .also { padded.recycle() }
        }
    }

    fun release() {
        if (released) return
        released = true
        synchronized(lock) {
            latest?.close()
            latest = null
        }
        display.release()
        reader.close()
        projection.stop()
    }

    // ponytail: tamanho lido ao começar a captura; girar a tela no meio da sessão desalinha o
    // recorte. Se incomodar, recriar o VirtualDisplay na mudança de orientação.
    private fun screenSize(context: Context): Point {
        val windowManager = context.getSystemService(WindowManager::class.java)
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val bounds = windowManager.maximumWindowMetrics.bounds
            Point(bounds.width(), bounds.height())
        } else {
            Point().also {
                @Suppress("DEPRECATION")
                windowManager.defaultDisplay.getRealSize(it)
            }
        }
    }
}
