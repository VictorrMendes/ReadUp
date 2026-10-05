package app.readup.readup

import android.app.Activity
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Bundle

/**
 * Tela transparente que só pede ao sistema a permissão de capturar a tela (exige uma Activity)
 * e entrega a resposta à bolha.
 */
class CaptureActivity : Activity() {
    companion object {
        private const val REQUEST_CAPTURE = 1
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) {
            val manager = getSystemService(MediaProjectionManager::class.java)
            @Suppress("DEPRECATION")
            startActivityForResult(manager.createScreenCaptureIntent(), REQUEST_CAPTURE)
        }
    }

    @Deprecated("Activity simples, sem AndroidX: o resultado vem por aqui")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CAPTURE) {
            startService(
                Intent(this, FloatService::class.java)
                    .setAction(FloatService.ACTION_PROJECTION)
                    .putExtra(FloatService.EXTRA_RESULT_CODE, resultCode)
                    .putExtra(FloatService.EXTRA_RESULT_DATA, data),
            )
        }
        finish()
    }
}
