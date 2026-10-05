package app.readup.readup

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Region
import android.os.Build
import android.view.MotionEvent
import android.view.View
import kotlin.math.max
import kotlin.math.min

/**
 * A tela congelada (o quadro capturado) com um véu escuro; a pessoa arrasta um retângulo sobre
 * o texto. Soltar devolve o retângulo em pixels do quadro; um toque sem arrastar cancela.
 */
@SuppressLint("ViewConstructor")
class SelectionView(
    context: Context,
    private val screenshot: Bitmap,
    private val onSelected: (Rect) -> Unit,
    private val onCancel: () -> Unit,
) : View(context) {
    private val density = resources.displayMetrics.density
    private val veil = Paint().apply { color = Color.argb(150, 0, 0, 0) }
    private val border = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 3 * density
        color = Color.rgb(0x3B, 0x3A, 0x98)
    }
    private val hint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 16 * resources.displayMetrics.scaledDensity
        textAlign = Paint.Align.CENTER
    }
    private val selection = RectF()
    private var startX = 0f
    private var startY = 0f

    init {
        contentDescription = "Arraste sobre o texto para traduzir"
    }

    override fun onDraw(canvas: Canvas) {
        canvas.drawBitmap(screenshot, null, Rect(0, 0, width, height), null)
        canvas.save()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            canvas.clipOutRect(selection)
        } else {
            @Suppress("DEPRECATION")
            canvas.clipRect(selection, Region.Op.DIFFERENCE)
        }
        canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), veil)
        canvas.restore()
        if (selection.isEmpty) {
            canvas.drawText("Arraste sobre o texto · toque para cancelar", width / 2f, height / 2f, hint)
        } else {
            canvas.drawRect(selection, border)
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    override fun onTouchEvent(event: MotionEvent): Boolean {
        when (event.action) {
            MotionEvent.ACTION_DOWN -> {
                startX = event.x
                startY = event.y
                selection.setEmpty()
            }
            MotionEvent.ACTION_MOVE -> {
                selection.set(
                    min(startX, event.x),
                    min(startY, event.y),
                    max(startX, event.x),
                    max(startY, event.y),
                )
                invalidate()
            }
            MotionEvent.ACTION_UP -> {
                val tooSmall = selection.width() < 24 * density || selection.height() < 12 * density
                if (tooSmall) onCancel() else onSelected(toScreenshot(selection))
            }
        }
        return true
    }

    /** De pixels da view para pixels do quadro (a view mostra o quadro esticado nela). */
    private fun toScreenshot(area: RectF): Rect {
        val scaleX = screenshot.width / width.toFloat()
        val scaleY = screenshot.height / height.toFloat()
        val left = (area.left * scaleX).toInt().coerceIn(0, screenshot.width - 1)
        val top = (area.top * scaleY).toInt().coerceIn(0, screenshot.height - 1)
        val right = (area.right * scaleX).toInt().coerceIn(left + 1, screenshot.width)
        val bottom = (area.bottom * scaleY).toInt().coerceIn(top + 1, screenshot.height)
        return Rect(left, top, right, bottom)
    }
}
