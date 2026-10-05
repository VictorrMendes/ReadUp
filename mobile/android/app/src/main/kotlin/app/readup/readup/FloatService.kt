package app.readup.readup

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.graphics.Outline
import android.graphics.PixelFormat
import android.os.Build
import android.os.IBinder
import android.provider.Settings
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.ImageView
import android.widget.Toast
import kotlin.math.abs

/**
 * Bolha de tradução sobre os outros apps. Fica num serviço em primeiro plano (com notificação
 * e botão "Desligar") para o sistema não a encerrar. A sessão (URL da API e token) chega pelo
 * Intent e fica só na memória: se o sistema recriar o serviço, ele não volta sozinho.
 */
class FloatService : Service() {
    companion object {
        const val EXTRA_API_URL = "apiUrl"
        const val EXTRA_TOKEN = "token"
        private const val ACTION_STOP = "app.readup.readup.FLOAT_STOP"
        private const val CHANNEL_ID = "float-translator"
        private const val NOTIFICATION_ID = 4201
        private const val BUBBLE_DP = 56

        @Volatile
        var running = false
            private set
    }

    private lateinit var windowManager: WindowManager
    private var bubble: View? = null
    private var apiUrl: String? = null
    private var token: String? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // startForegroundService exige startForeground logo, mesmo quando o serviço vai parar
        startInForeground()
        if (intent?.action == ACTION_STOP) {
            stopSelf()
            return START_NOT_STICKY
        }
        apiUrl = intent?.getStringExtra(EXTRA_API_URL) ?: apiUrl
        token = intent?.getStringExtra(EXTRA_TOKEN) ?: token
        if (apiUrl == null || token == null || !Settings.canDrawOverlays(this)) {
            stopSelf()
            return START_NOT_STICKY
        }
        if (bubble == null) showBubble()
        running = true
        return START_NOT_STICKY
    }

    override fun onDestroy() {
        bubble?.let { windowManager.removeView(it) }
        bubble = null
        token = null
        running = false
        super.onDestroy()
    }

    private fun startInForeground() {
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
            startForeground(
                NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

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
        val params = WindowManager.LayoutParams(
            size,
            size,
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
            } else {
                @Suppress("DEPRECATION")
                WindowManager.LayoutParams.TYPE_PHONE
            },
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,
            PixelFormat.TRANSLUCENT,
        ).apply {
            gravity = Gravity.TOP or Gravity.START
            x = 0
            y = resources.displayMetrics.heightPixels / 3
        }
        view.setOnTouchListener(BubbleDrag(params, view))
        windowManager.addView(view, params)
        bubble = view
    }

    private fun onBubbleTap() {
        // a seleção da área, a captura e o OCR entram na próxima etapa
        Toast.makeText(this, "Em breve: marque o texto para traduzir", Toast.LENGTH_SHORT).show()
    }

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
