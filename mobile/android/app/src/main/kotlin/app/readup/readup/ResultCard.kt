package app.readup.readup

import android.content.Context
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView

/** Cartão no pé da tela com o trecho lido, a tradução e as ações. */
class ResultCard(context: Context, onAi: () -> Unit, onClose: () -> Unit) {
    private val density = context.resources.displayMetrics.density
    private val status = text(context, size = 15f, color = Color.rgb(0x6B, 0x65, 0x60))
    private val original = text(context, size = 14f, color = Color.rgb(0x6B, 0x65, 0x60)).apply {
        maxLines = 4
        ellipsize = TextUtils.TruncateAt.END
    }
    private val translation = text(context, size = 18f, color = Color.rgb(0x1C, 0x19, 0x17)).apply {
        maxLines = 10
        ellipsize = TextUtils.TruncateAt.END
        typeface = Typeface.DEFAULT_BOLD
    }
    private val aiButton = Button(context).apply {
        text = "Traduzir com IA"
        setOnClickListener { onAi() }
    }

    val view: View = LinearLayout(context).apply {
        orientation = LinearLayout.VERTICAL
        val pad = (20 * density).toInt()
        setPadding(pad, pad, pad, (12 * density).toInt())
        background = GradientDrawable().apply {
            setColor(Color.WHITE)
            cornerRadius = 20 * density
        }
        elevation = 12 * density
        addView(status)
        addView(original)
        addView(translation)
        addView(LinearLayout(context).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
            addView(aiButton)
            addView(Button(context).apply {
                text = "Fechar"
                setOnClickListener { onClose() }
            })
        })
    }

    fun loading(message: String) = show(status = message, offerAi = false)

    fun result(text: String, translated: String?) = show(
        original = text,
        translated = translated,
        status = if (translated == null) "Sem tradução agora. Tente a IA." else null,
        offerAi = translated == null,
    )

    fun error(message: String, offerAi: Boolean) = show(status = message, offerAi = offerAi)

    /** Antes do primeiro envio: o recorte da tela sai do aparelho, então a pessoa confirma. */
    fun askAiConsent() {
        show(
            status = "A imagem do trecho marcado vai para a IA (NVIDIA) ler e traduzir. Enviar?",
            offerAi = true,
        )
        aiButton.text = "Enviar imagem"
    }

    private fun show(
        status: String? = null,
        original: String? = null,
        translated: String? = null,
        offerAi: Boolean,
    ) {
        set(this.status, status)
        set(this.original, original)
        set(this.translation, translated)
        aiButton.text = "Traduzir com IA"
        aiButton.visibility = if (offerAi) View.VISIBLE else View.GONE
    }

    private fun set(view: TextView, value: String?) {
        view.text = value
        view.visibility = if (value.isNullOrEmpty()) View.GONE else View.VISIBLE
    }

    private fun text(context: Context, size: Float, color: Int) = TextView(context).apply {
        textSize = size
        setTextColor(color)
        setPadding(0, 0, 0, (8 * density).toInt())
    }
}
