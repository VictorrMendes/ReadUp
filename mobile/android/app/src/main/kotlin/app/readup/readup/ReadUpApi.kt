package app.readup.readup

import android.os.Handler
import android.os.Looper
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

sealed class ApiResult {
    data class Ok(val text: String, val translation: String?) : ApiResult()

    data class Failure(val message: String, val sessionExpired: Boolean = false) : ApiResult()
}

/** Chamadas da bolha à API do ReadUp, fora da thread principal; a resposta volta nela. */
class ReadUpApi(private val baseUrl: String, private val token: String) {
    private val executor = Executors.newSingleThreadExecutor()
    private val main = Handler(Looper.getMainLooper())

    fun translateText(text: String, done: (ApiResult) -> Unit) =
        post("/vocabulary/translate-text", JSONObject().put("text", text), done)

    fun translateImage(base64Jpeg: String, done: (ApiResult) -> Unit) =
        post("/vocabulary/translate-image", JSONObject().put("image", base64Jpeg), done)

    fun shutdown() {
        executor.shutdownNow()
    }

    private fun post(path: String, body: JSONObject, done: (ApiResult) -> Unit) {
        executor.execute {
            val result = request(path, body)
            main.post { done(result) }
        }
    }

    private fun request(path: String, body: JSONObject): ApiResult {
        var connection: HttpURLConnection? = null
        return try {
            connection = URL(baseUrl.trimEnd('/') + path).openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.connectTimeout = 10_000
            connection.readTimeout = 45_000 // a IA pode levar até 30 s
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Authorization", "Bearer $token")
            connection.outputStream.use { it.write(body.toString().toByteArray()) }
            val code = connection.responseCode
            val stream = if (code in 200..299) connection.inputStream else connection.errorStream
            val json = stream?.bufferedReader()?.use { it.readText() }
                ?.let { runCatching { JSONObject(it) }.getOrNull() }
            when {
                code in 200..299 && json != null -> ApiResult.Ok(
                    text = json.optString("text"),
                    translation = if (json.isNull("translation")) null else json.optString("translation"),
                )
                code == 401 -> ApiResult.Failure(
                    "Sua sessão expirou. Abra o ReadUp e ligue a bolha de novo.",
                    sessionExpired = true,
                )
                // a FastAPI manda "detail" como texto nos erros nossos (429, 502, 503)
                else -> ApiResult.Failure(
                    (json?.opt("detail") as? String) ?: "Não deu para traduzir agora. Tente de novo.",
                )
            }
        } catch (e: IOException) {
            ApiResult.Failure("Sem conexão com o ReadUp.")
        } finally {
            connection?.disconnect()
        }
    }
}
