package com.mercaditotec.android

import android.app.DownloadManager
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.os.Message
import android.provider.MediaStore
import android.webkit.CookieManager
import android.webkit.DownloadListener
import android.webkit.SslErrorHandler
import android.net.http.SslError
import android.webkit.URLUtil
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.Button
import android.widget.TextView
import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.webkit.WebSettings
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.FileProvider
import java.io.File

/**
 * Hosts the COMPLETE, production MercaditoTec web application.
 * No duplicated store catalogue or fake native pages.
 *
 * This is a hybrid WebView shell: the UI continues to be the real Next.js app;
 * Android supplies a native window, file/image selection, downloads and back.
 */
class MainActivity : ComponentActivity() {
    private val home = "https://mercaditotec.store/descubre"
    private val trustedHost = "mercaditotec.store"
    private lateinit var webView: WebView
    private lateinit var loading: ProgressBar
    private lateinit var errorPanel: LinearLayout
    private var chooserCallback: ValueCallback<Array<Uri>>? = null
    private var pendingCameraUri: Uri? = null

    private val picker = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val callback = chooserCallback ?: return@registerForActivityResult
        chooserCallback = null
        val fromPicker = WebChromeClient.FileChooserParams.parseResult(result.resultCode, result.data)
        val fromCamera = if (
            result.resultCode == RESULT_OK && fromPicker.isNullOrEmpty()
        ) pendingCameraUri?.let { arrayOf(it) } else null
        pendingCameraUri = null
        callback.onReceiveValue(fromPicker ?: fromCamera)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.statusBarColor = Color.rgb(18, 59, 131)
        window.navigationBarColor = Color.rgb(18, 59, 131)
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = 0

        val root = FrameLayout(this)
        webView = WebView(this)
        root.addView(webView, FrameLayout.LayoutParams(-1, -1))

        loading = ProgressBar(this)
        root.addView(loading, FrameLayout.LayoutParams(110, 110, Gravity.CENTER))

        errorPanel = makeErrorPanel()
        errorPanel.visibility = View.GONE
        root.addView(errorPanel, FrameLayout.LayoutParams(-1, -1))
        setContentView(root)

        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            allowFileAccess = false
            allowContentAccess = true
            javaScriptCanOpenWindowsAutomatically = false
            setSupportMultipleWindows(true)
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
            cacheMode = WebSettings.LOAD_DEFAULT
            useWideViewPort = true
            loadWithOverviewMode = true
            mediaPlaybackRequiresUserGesture = true
            builtInZoomControls = false
            displayZoomControls = false
        }

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false)

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                route(request.url, view)

            override fun onPageStarted(view: WebView, url: String?, favicon: android.graphics.Bitmap?) {
                loading.visibility = View.VISIBLE
                errorPanel.visibility = View.GONE
            }

            override fun onPageFinished(view: WebView, url: String?) {
                loading.visibility = View.GONE
                CookieManager.getInstance().flush()
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame) showFailure()
            }

            override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, response: android.webkit.WebResourceResponse) {
                if (request.isForMainFrame && response.statusCode >= 500) showFailure()
            }

            // Never permit invalid TLS certificates, even on public Wi-Fi.
            override fun onReceivedSslError(view: WebView, handler: SslErrorHandler, error: SslError) {
                handler.cancel()
                showFailure()
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView, newProgress: Int) {
                if (newProgress >= 90) loading.visibility = View.GONE
            }

            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams,
            ): Boolean {
                chooserCallback?.onReceiveValue(null)
                chooserCallback = callback
                openPicker(params)
                return true
            }

            override fun onCreateWindow(
                view: WebView,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: Message,
            ): Boolean {
                if (!isUserGesture) return false
                // A user-clicked target=_blank is routed by the same allowlist.
                val child = WebView(this@MainActivity)
                child.webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        view: WebView, request: WebResourceRequest,
                    ): Boolean {
                        openPopupUrl(request.url)
                        view.post { view.destroy() }
                        return true
                    }

                    override fun onPageStarted(
                        view: WebView, url: String?, favicon: android.graphics.Bitmap?,
                    ) {
                        if (url != null && url != "about:blank") openPopupUrl(Uri.parse(url))
                        view.stopLoading()
                        view.post { view.destroy() }
                    }
                }
                val transport = resultMsg.obj as WebView.WebViewTransport
                transport.webView = child
                resultMsg.sendToTarget()
                return true
            }
        }

        webView.setDownloadListener(DownloadListener { url, userAgent, disposition, mime, _ ->
            download(url, userAgent, disposition, mime)
        })

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                when {
                    errorPanel.visibility == View.VISIBLE -> retry()
                    webView.canGoBack() -> webView.goBack()
                    else -> finish()
                }
            }
        })

        webView.loadUrl(savedInstanceState?.getString("lastPage")?.takeIf { allowed(Uri.parse(it)) } ?: home)
    }

    private fun allowed(uri: Uri): Boolean =
        uri.scheme.equals("https", true) && uri.host.equals(trustedHost, true)

    private fun route(uri: Uri, target: WebView): Boolean {
        if (allowed(uri)) {
            // Normal in-site links are handled natively by WebView navigation,
            // unless this is a temporary popup targeting the main WebView.
            if (target === webView) return false
            webView.loadUrl(uri.toString())
            return true
        }
        if (uri.scheme == "about") return false
        try {
            val intent = if (uri.scheme == "intent") {
                Intent.parseUri(uri.toString(), Intent.URI_INTENT_SCHEME).apply {
                    addCategory(Intent.CATEGORY_BROWSABLE)
                    component = null
                    selector = null
                }
            } else {
                Intent(Intent.ACTION_VIEW, uri).apply {
                    addCategory(Intent.CATEGORY_BROWSABLE)
                }
            }
            startActivity(intent)
        } catch (_: Exception) {
            // If WhatsApp or an external handler is unavailable, stay in Mercadito.
        }
        return true
    }

    private fun openPopupUrl(uri: Uri) {
        if (allowed(uri)) webView.loadUrl(uri.toString())
        else route(uri, webView)
    }

    private fun openPicker(params: WebChromeClient.FileChooserParams) {
        try {
            val choose = params.createIntent().apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = params.acceptTypes.firstOrNull { it.isNotBlank() }?.let { accept ->
                    if (accept.startsWith(".")) "image/*" else accept
                } ?: "*/*"
                putExtra(Intent.EXTRA_ALLOW_MULTIPLE, params.mode == WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE)
            }
            val canCamera = params.acceptTypes.any { it.startsWith("image/") } || choose.type?.startsWith("image/") == true
            val captureIntent = if (canCamera) makeCameraIntent() else null
            val chooser = Intent.createChooser(choose, "Seleccionar archivo")
            if (captureIntent != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, arrayOf(captureIntent))
            picker.launch(chooser)
        } catch (_: Exception) {
            chooserCallback?.onReceiveValue(null)
            chooserCallback = null
            pendingCameraUri = null
        }
    }

    private fun makeCameraIntent(): Intent? = try {
        val file = File.createTempFile("mercaditotec-photo-", ".jpg", cacheDir)
        pendingCameraUri = FileProvider.getUriForFile(this, "$packageName.files", file)
        Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
            putExtra(MediaStore.EXTRA_OUTPUT, pendingCameraUri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            clipData = ClipData.newUri(contentResolver, "photo", pendingCameraUri)
        }
    } catch (_: Exception) {
        pendingCameraUri = null
        null
    }

    private fun download(url: String, userAgent: String, disposition: String, mime: String) {
        val uri = Uri.parse(url)
        if (uri.scheme != "https") return
        try {
            val filename = URLUtil.guessFileName(url, disposition, mime)
            val manager = getSystemService(DOWNLOAD_SERVICE) as DownloadManager
            manager.enqueue(
                DownloadManager.Request(uri)
                    .setMimeType(mime)
                    .addRequestHeader("User-Agent", userAgent)
                    .addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url) ?: "")
                    .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                    .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename),
            )
        } catch (_: Exception) {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
        }
    }

    private fun makeErrorPanel(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        gravity = Gravity.CENTER
        setBackgroundColor(Color.rgb(255, 249, 238))
        setPadding(36, 36, 36, 36)
        addView(TextView(context).apply {
            text = "MercaditoTec"
            textSize = 28f
            setTextColor(Color.rgb(18, 59, 131))
            gravity = Gravity.CENTER
        })
        addView(TextView(context).apply {
            text = "No se pudo cargar el Mercadito. Revisa tu conexión e inténtalo de nuevo."
            textSize = 16f
            gravity = Gravity.CENTER
            setPadding(0, 18, 0, 18)
            setTextColor(Color.DKGRAY)
        })
        addView(Button(context).apply {
            text = "Reintentar"
            setOnClickListener { retry() }
        })
    }

    private fun showFailure() {
        loading.visibility = View.GONE
        errorPanel.visibility = View.VISIBLE
    }

    private fun retry() {
        errorPanel.visibility = View.GONE
        webView.reload()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        outState.putString("lastPage", webView.url?.takeIf { allowed(Uri.parse(it)) } ?: home)
        super.onSaveInstanceState(outState)
    }

    override fun onDestroy() {
        chooserCallback?.onReceiveValue(null)
        chooserCallback = null
        webView.destroy()
        super.onDestroy()
    }
}
