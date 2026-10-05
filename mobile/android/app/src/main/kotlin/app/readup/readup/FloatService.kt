package app.readup.readup

import android.app.Activity
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Bitmap
import android.graphics.Outline
import android.graphics.PixelFormat
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.Base64
import android.view.ContextThemeWrapper
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.ImageView
import android.widget.Toast
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.ByteArrayOutputStream
import kotlin.math.abs
import kotlin.math.max

/**
 * Bolha de tradução sobre os outros apps. Tocar nela congela a tela, a pessoa marca o texto, o
 * OCR do aparelho (ML Kit) lê e a API do ReadUp traduz; se o OCR não der conta, a IA lê o
 * recorte (com o aceite da pessoa). Não conta leitura: só traduz.
 *
 * Fica num serviço em primeiro plano (notificação com "Desligar"). A sessão (URL da API e
 * token) chega pelo Intent e fica só na memória: se o sistema recriar o serviço, ele não volta.
 */
class FloatService : Service() {
    companion object {
        const val EXTRA_API_URL = "apiUrl"
        const val EXTRA_TOKEN = "token"
        const val ACTION_PROJECTION = "app.readup.readup.FLOAT_PROJECTION"
        const val EXTRA_RESULT_CODE = "resultCode"
        const val EXTRA_RESULT_DATA = "resultData"
        private const val ACTION_STOP = "app.readup.readup.FLOAT_STOP"
        private const val CHANNEL_ID = "float-translator"
        private const val NOTIFICATION_ID = 4201
        private const val BUBBLE_DP = 56
        private const val MAX_TEXT_LENGTH = 450 // o mesmo teto do backend (MyMemory)
        private const val MAX_IMAGE_SIDE = 1024
        private const val PREFS = "readup_float"
        private const val KEY_AI_CONSENT = "ai_consent"

        @Volatile
        var running = false
            private set
    }

    private val main = Handler(Looper.getMainLooper())
    private lateinit var windowManager: WindowManager
    private var api: ReadUpApi? = null
    private var recognizer: TextRecognizer? = null
    private var capture: ScreenCapture? = null
    private var pendingCapture = false
    private var bubble: View? = null
    private var selection: View? = null
    private var card: ResultCard? = null
    private var lastCrop: Bitmap? = null
    private var askingAiConsent = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> {
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_PROJECTION -> {
                onProjectionResult(intent)
                return START_NOT_STICKY
            }
        }
        // startForegroundService exige startForeground logo, mesmo quando o serviço vai parar
        startInForeground(withCapture = capture != null)
        val apiUrl = intent?.getStringExtra(EXTRA_API_URL)
        val token = intent?.getStringExtra(EXTRA_TOKEN)
        if (apiUrl == null || token == null || !Settings.canDrawOverlays(this)) {
            if (api == null) stopSelf()
            return START_NOT_STICKY
        }
        api?.shutdown()
        api = ReadUpApi(apiUrl, token)
        if (bubble == null) showBubble()
        running = true
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        removeSelection()
        hideCard()
        bubble?.let { windowManager.removeView(it) }
        bubble = null
        capture?.release()
        capture = null
        recognizer?.close()
        api?.shutdown()
        api = null
        running = false
        super.onDestroy()
    }

    // --- primeiro plano ---

    private fun startInForeground(withCapture: Boolean) {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "Tradução flutuante",
                    NotificationManager.IMPORTANCE_LOW,
                ).apply { description = "Aparece enquanto a bolha de tradução está ligada" },
            )
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        val stop = PendingIntent.getService(
            this, 0, Intent(this, FloatService::class.java).setAction(ACTION_STOP), flags,
        )
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java), flags,
        )
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Notification.Builder(this, CHANNEL_ID)
        } else {
            @Suppress("DEPRECATION")
            Notification.Builder(this)
        }
        val notification = builder
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Tradução flutuante ligada")
            .setContentText("Toque na bolha e marque o texto para traduzir")
            .setContentIntent(open)
            .setOngoing(true)
            .addAction(Notification.Action.Builder(null, "Desligar", stop).build())
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            // Android 14: o tipo "captura de tela" só pode entrar depois do aceite da pessoa
            var type = ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            if (withCapture) type = type or ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
            startForeground(NOTIFICATION_ID, notification, type)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    // --- bolha ---

    private fun showBubble() {
        val density = resources.displayMetrics.density
        val size = (BUBBLE_DP * density).toInt()
        val view = ImageView(this).apply {
            setImageResource(R.mipmap.ic_launcher)
            contentDescription = "Traduzir um trecho da tela (ReadUp)"
            elevation = 6 * density
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setOval(0, 0, view.width, view.height)
                }
            }
            clipToOutline = true
        }
        val params = overlayParams(size, size).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0
            y = resources.displayMetrics.heightPixels / 3
        }
        view.setOnTouchListener(BubbleDrag(params, view))
        windowManager.addView(view, params)
        bubble = view
    }

    private fun onBubbleTap() {
        if (selection != null) return
        hideCard()
        val current = capture
        if (current == null) {
            // a permissão de captura é pedida no primeiro toque e vale enquanto a bolha estiver
            // ligada; o toque continua quando ela chegar
            pendingCapture = true
            startActivity(
                Intent(this, CaptureActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
            )
            return
        }
        grabScreen(current, delayMs = 200)
    }

    /** Esconde a bolha, espera um quadro sem ela e congela a tela para a seleção. */
    private fun grabScreen(source: ScreenCapture, delayMs: Long) {
        bubble?.visibility = View.INVISIBLE
        main.postDelayed({
            val shot = source.capture()
            bubble?.visibility = View.VISIBLE
            if (shot == null) {
                toast("Não deu para capturar a tela. Tente de novo.")
            } else {
                showSelection(shot)
            }
        }, delayMs)
    }

    private fun onProjectionResult(intent: Intent) {
        val wanted = pendingCapture
        pendingCapture = false
        val code = intent.getIntExtra(EXTRA_RESULT_CODE, Activity.RESULT_CANCELED)
        val data = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.getParcelableExtra(EXTRA_RESULT_DATA, Intent::class.java)
        } else {
            @Suppress("DEPRECATION")
            intent.getParcelableExtra<Intent>(EXTRA_RESULT_DATA)
        }
        if (code != Activity.RESULT_OK || data == null || api == null) return
        startInForeground(withCapture = true)
        val created = try {
            ScreenCapture(this, code, data) { capture = null }
        } catch (e: RuntimeException) {
            null // SecurityException e afins: o sistema não liberou a captura
        }
        capture = created
        if (created == null) {
            toast("O Android não liberou a captura da tela.")
        } else if (wanted) {
            // a janela de permissão ainda está sumindo: um quadro limpo leva um pouco mais
            grabScreen(created, delayMs = 600)
        }
    }

    // --- seleção ---

    private fun showSelection(shot: Bitmap) {
        val view = SelectionView(
            this,
            shot,
            onSelected = { area ->
                removeSelection()
                translateRegion(Bitmap.createBitmap(shot, area.left, area.top, area.width(), area.height()))
            },
            onCancel = { removeSelection() },
        )
        val params = overlayParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
        ).apply {
            flags = flags or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
        }
        windowManager.addView(view, params)
        selection = view
    }

    private fun removeSelection() {
        selection?.let { windowManager.removeView(it) }
        selection = null
    }

    // --- leitura e tradução ---

    private fun translateRegion(crop: Bitmap) {
        lastCrop = crop
        askingAiConsent = false
        val shown = showCard()
        shown.loading("Lendo o texto…")
        val reader = recognizer ?: TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            .also { recognizer = it }
        reader.process(InputImage.fromBitmap(crop, 0))
            .addOnSuccessListener { result ->
                if (card !== shown) return@addOnSuccessListener // fechado ou trocado no meio
                val text = result.textBlocks.joinToString(" ") { it.text }
                    .split(Regex("\\s+")).filter { it.isNotEmpty() }.joinToString(" ")
                when {
                    text.none { it.isLetter() } ->
                        shown.error("Nenhum texto encontrado neste trecho.", offerAi = true)
                    text.length > MAX_TEXT_LENGTH ->
                        shown.error("Trecho grande demais. Marque uma parte menor.", offerAi = true)
                    else -> {
                        shown.loading("Traduzindo…")
                        api?.translateText(text) { show(shown, it) }
                    }
                }
            }
            .addOnFailureListener {
                // o modelo do OCR vem pelo Google Play e pode ainda estar baixando
                if (card === shown) {
                    shown.error("O leitor de texto ainda está sendo preparado. Tente em instantes.", offerAi = true)
                }
            }
    }

    private fun onAi() {
        val crop = lastCrop ?: return
        val shown = card ?: return
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_AI_CONSENT, false)) {
            if (!askingAiConsent) {
                askingAiConsent = true
                shown.askAiConsent()
                return
            }
            prefs.edit().putBoolean(KEY_AI_CONSENT, true).apply()
        }
        askingAiConsent = false
        shown.loading("A IA está lendo o trecho…")
        api?.translateImage(encodeJpeg(crop)) { show(shown, it) }
    }

    private fun show(shown: ResultCard, result: ApiResult) {
        if (card !== shown) return
        when (result) {
            is ApiResult.Ok -> shown.result(result.text, result.translation)
            is ApiResult.Failure -> if (result.sessionExpired) {
                toast(result.message)
                stopSelf()
            } else {
                shown.error(result.message, offerAi = true)
            }
        }
    }

    /** Recorte reduzido (lado maior até 1024 px) em JPEG/base64: rápido de enviar e barato. */
    private fun encodeJpeg(source: Bitmap): String {
        val scale = MAX_IMAGE_SIDE.toFloat() / max(source.width, source.height)
        val image = if (scale < 1f) {
            Bitmap.createScaledBitmap(
                source,
                (source.width * scale).toInt().coerceAtLeast(1),
                (source.height * scale).toInt().coerceAtLeast(1),
                true,
            )
        } else {
            source
        }
        val bytes = ByteArrayOutputStream().also { image.compress(Bitmap.CompressFormat.JPEG, 80, it) }
        return Base64.encodeToString(bytes.toByteArray(), Base64.NO_WRAP)
    }

    // --- cartão ---

    private fun showCard(): ResultCard {
        hideCard()
        val themed = ContextThemeWrapper(this, android.R.style.Theme_DeviceDefault_Light)
        val created = ResultCard(themed, onAi = { onAi() }, onClose = { hideCard() })
        val margin = (16 * resources.displayMetrics.density).toInt()
        val params = overlayParams(
            resources.displayMetrics.widthPixels - 2 * margin,
            WindowManager.LayoutParams.WRAP_CONTENT,
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = 2 * margin
        }
        windowManager.addView(created.view, params)
        card = created
        return created
    }

    private fun hideCard() {
        card?.let { windowManager.removeView(it.view) }
        card = null
        askingAiConsent = false
    }

    // --- utilidades ---

    /** Janela sobre os outros apps que não rouba o teclado (toques fora dela seguem para o app). */
    private fun overlayParams(width: Int, height: Int) = WindowManager.LayoutParams(
        width,
        height,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        } else {
            @Suppress("DEPRECATION")
            WindowManager.LayoutParams.TYPE_PHONE
        },
        WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
        PixelFormat.TRANSLUCENT,
    )

    private fun toast(message: String) = Toast.makeText(this, message, Toast.LENGTH_LONG).show()

    /** Arrastar move a bolha (e ela encosta na borda mais perto ao soltar); tocar traduz. */
    private inner class BubbleDrag(
        private val params: WindowManager.LayoutParams,
        private val view: View,
    ) : View.OnTouchListener {
        private val slop = ViewConfiguration.get(this@FloatService).scaledTouchSlop
        private var startX = 0
        private var startY = 0
        private var touchX = 0f
        private var touchY = 0f
        private var dragging = false

        override fun onTouch(v: View, event: MotionEvent): Boolean {
            when (event.action) {
                MotionEvent.ACTION_DOWN -> {
                    startX = params.x
                    startY = params.y
                    touchX = event.rawX
                    touchY = event.rawY
                    dragging = false
                }
                MotionEvent.ACTION_MOVE -> {
                    val dx = event.rawX - touchX
                    val dy = event.rawY - touchY
                    if (!dragging && (abs(dx) > slop || abs(dy) > slop)) dragging = true
                    if (dragging) {
                        params.x = startX + dx.toInt()
                        params.y = startY + dy.toInt()
                        windowManager.updateViewLayout(view, params)
                    }
                }
                MotionEvent.ACTION_UP -> {
                    if (dragging) {
                        val screen = resources.displayMetrics.widthPixels
                        params.x = if (params.x + view.width / 2 < screen / 2) 0 else screen - view.width
                        windowManager.updateViewLayout(view, params)
                    } else {
                        v.performClick()
                        onBubbleTap()
                    }
                }
            }
            return true
        }
    }
}
