package com.mercaditotec.android

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.util.Locale

/**
 * Native HTTP client. Firebase credentials are obtained from its public
 * Identity Toolkit REST API. No browser, cookies or WebView are involved.
 *
 * The API key below is already present in the public web Firebase config;
 * it is not a Firebase service-account key or privileged server secret.
 */
internal object NativeApi {
    private const val BACKEND = "https://mercaditotec.store"
    private const val FIREBASE_KEY = "AIzaSyAkWKoXLU3Xaqy_4prycNsnJiz6YvYGE5M"
    private const val EMAIL_DOMAIN = "@morelia.tecnm.mx"

    data class Session(
        val idToken: String,
        val email: String,
    )

    data class Store(
        val id: String,
        val name: String,
        val slug: String,
        val description: String,
        val deliveryLocation: String,
        val marketplaceLabel: String,
        val categoryTags: List<String>,
        val openNow: Boolean,
        val demo: Boolean,
    )

    data class Catalogue(
        val stores: List<Store>,
        val realStoreCount: Int,
    )

    class RequestFailure(message: String) : IOException(message)

    suspend fun login(institutionalUser: String, password: String): Session = withContext(Dispatchers.IO) {
        val clean = institutionalUser.trim().lowercase(Locale.ROOT)
        val email = if ("@" in clean) clean else "$clean$EMAIL_DOMAIN"
        if (!email.endsWith(EMAIL_DOMAIN) || email.substringBefore("@").isBlank()) {
            throw RequestFailure("Utiliza tu correo institucional @morelia.tecnm.mx.")
        }
        if (password.isBlank()) throw RequestFailure("Escribe tu contraseña.")

        val identity = request(
            url = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=$FIREBASE_KEY",
            method = "POST",
            body = JSONObject()
                .put("email", email)
                .put("password", password)
                .put("returnSecureToken", true),
        )
        val token = identity.optString("idToken")
        if (token.isBlank()) throw RequestFailure("Firebase no entregó una sesión válida.")
        val signedIn = Session(token, identity.optString("email", email))

        // The server owns the rules: verified/manual account admission,
        // institutional age limit, account suspension and access decisions.
        request("$BACKEND/api/account/sync", method = "POST", token = signedIn.idToken)
        val eligibility = request("$BACKEND/api/account/session", token = signedIn.idToken)
        if (!eligibility.optBoolean("eligible", false)) {
            throw RequestFailure("Tu cuenta no tiene acceso autorizado al Mercadito.")
        }
        signedIn
    }

    suspend fun catalogue(session: Session): Catalogue = withContext(Dispatchers.IO) {
        val result = request("$BACKEND/api/marketplace", token = session.idToken)
        val jsonStores = result.optJSONArray("stores") ?: JSONArray()
        val stores = buildList {
            for (index in 0 until jsonStores.length()) {
                val entry = jsonStores.optJSONObject(index) ?: continue
                val id = entry.optString("id")
                val slug = entry.optString("slug")
                if (id.isBlank() || slug.isBlank()) continue
                val tags = entry.optJSONArray("marketplaceTags") ?: JSONArray()
                add(
                    Store(
                        id = id,
                        name = entry.optString("name"),
                        slug = slug,
                        description = entry.optString("description"),
                        deliveryLocation = entry.optString("deliveryLocation"),
                        marketplaceLabel = entry.optString("marketplaceLabel"),
                        categoryTags = (0 until tags.length())
                            .mapNotNull { tags.optString(it).takeIf(String::isNotBlank) },
                        openNow = entry.optBoolean("openNow", false),
                        demo = id.startsWith("demo-"),
                    ),
                )
            }
        }
        Catalogue(stores, result.optInt("realStoreCount", stores.count { !it.demo }))
    }

    private fun request(
        url: String,
        method: String = "GET",
        body: JSONObject? = null,
        token: String? = null,
    ): JSONObject {
        val connection = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 25_000
            instanceFollowRedirects = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Cache-Control", "no-store")
            if (token != null) setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
        }
        return try {
            if (body != null) {
                connection.outputStream.use {
                    it.write(body.toString().toByteArray(Charsets.UTF_8))
                }
            }
            val status = connection.responseCode
            val text = (
                if (status in 200..299) connection.inputStream else connection.errorStream
            )?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            val payload = try { JSONObject(text) } catch (_: Exception) { JSONObject() }
            if (status !in 200..299) {
                val firebaseCode = payload.optJSONObject("error")?.optString("message").orEmpty()
                val backendMessage = payload.optString("error")
                val friendly = when (firebaseCode) {
                    "INVALID_LOGIN_CREDENTIALS", "EMAIL_NOT_FOUND", "INVALID_PASSWORD" ->
                        "Usuario o contraseña incorrectos."
                    "USER_DISABLED" -> "La cuenta fue deshabilitada."
                    "TOO_MANY_ATTEMPTS_TRY_LATER" -> "Demasiados intentos. Inténtalo después."
                    else -> backendMessage.takeIf { it.isNotBlank() }
                        ?: "No se pudo completar la solicitud (HTTP $status)."
                }
                throw RequestFailure(friendly)
            }
            payload
        } catch (error: IOException) {
            if (error is RequestFailure) throw error
            throw RequestFailure("No fue posible conectar con MercaditoTec. Revisa tu conexión.")
        } finally {
            connection.disconnect()
        }
    }
}
