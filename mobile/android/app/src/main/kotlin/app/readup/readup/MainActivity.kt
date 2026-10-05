package app.readup.readup

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        // tradução flutuante: o Flutter liga/desliga a bolha (FloatService) e cuida da permissão
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, "readup/float")
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "hasOverlayPermission" -> result.success(Settings.canDrawOverlays(this))
                    "openOverlaySettings" -> {
                        startActivity(
                            Intent(
                                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                                Uri.parse("package:$packageName"),
                            ),
                        )
                        result.success(true)
                    }
                    "isRunning" -> result.success(FloatService.running)
                    "start" -> {
                        val apiUrl = call.argument<String>("apiUrl")
                        val token = call.argument<String>("token")
                        if (apiUrl == null || token == null || !Settings.canDrawOverlays(this)) {
                            result.success(false)
                        } else {
                            val intent = Intent(this, FloatService::class.java)
                                .putExtra(FloatService.EXTRA_API_URL, apiUrl)
                                .putExtra(FloatService.EXTRA_TOKEN, token)
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                                startForegroundService(intent)
                            } else {
                                startService(intent)
                            }
                            result.success(true)
                        }
                    }
                    "stop" -> {
                        stopService(Intent(this, FloatService::class.java))
                        result.success(true)
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
