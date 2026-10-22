import UIKit
import WebKit

/// Full MercaditoTec. Every tab and interaction is served by the existing
/// Next.js application; we do NOT reimplement a partial shop directory.
/// WKWebView is a native iOS system component, but the UI itself is hybrid.
final class MercadoViewController: UIViewController, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate, WKScriptMessageHandler {
    private let website = URL(string: "https://mercaditotec.store/descubre")!
    private let allowedHost = "mercaditotec.store"
    private var webView: WKWebView!
    private let progress = UIProgressView(progressViewStyle: .bar)
    private let refresh = UIRefreshControl()
    private var progressObserver: NSKeyValueObservation?
    private var lastDownloadedFile: URL?

    private let offline: UIView = {
        let container = UIView()
        container.translatesAutoresizingMaskIntoConstraints = false
        container.backgroundColor = UIColor(red: 1.0, green: 0.976, blue: 0.933, alpha: 1)
        container.isHidden = true
        return container
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 1, green: 0.976, blue: 0.933, alpha: 1)

        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.defaultWebpagePreferences.allowsContentJavaScript = true
        configuration.userContentController.add(self, name: "MercaditoBridge")
        if let scriptURL = Bundle.main.url(forResource: "MobileBridge", withExtension: "js"),
           let script = try? String(contentsOf: scriptURL, encoding: .utf8) {
            configuration.userContentController.addUserScript(
                WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: true)
            )
        }

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor

        refresh.addTarget(self, action: #selector(reload), for: .valueChanged)
        webView.scrollView.refreshControl = refresh
        view.addSubview(webView)

        progress.translatesAutoresizingMaskIntoConstraints = false
        progress.tintColor = UIColor(red: 0.96, green: 0.48, blue: 0.25, alpha: 1)
        view.addSubview(progress)

        view.addSubview(offline)
        let heading = UILabel()
        heading.text = "MercaditoTec"
        heading.font = .systemFont(ofSize: 29, weight: .heavy)
        heading.textColor = UIColor(red: 0.07, green: 0.23, blue: 0.51, alpha: 1)
        heading.textAlignment = .center
        let explanation = UILabel()
        explanation.text = "No se pudo cargar el Mercadito. Comprueba tu conexión e inténtalo de nuevo."
        explanation.numberOfLines = 0
        explanation.textAlignment = .center
        explanation.textColor = .darkGray
        let retry = UIButton(type: .system)
        retry.setTitle("Reintentar", for: .normal)
        retry.titleLabel?.font = .boldSystemFont(ofSize: 17)
        retry.addTarget(self, action: #selector(reload), for: .touchUpInside)
        let stack = UIStackView(arrangedSubviews: [heading, explanation, retry])
        stack.axis = .vertical
        stack.spacing = 22
        stack.translatesAutoresizingMaskIntoConstraints = false
        offline.addSubview(stack)

        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            progress.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            progress.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            progress.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            offline.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            offline.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            offline.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            offline.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            stack.centerXAnchor.constraint(equalTo: offline.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: offline.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: offline.leadingAnchor, constant: 30),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: offline.trailingAnchor, constant: -30),
            stack.widthAnchor.constraint(lessThanOrEqualToConstant: 360),
        ])

        progressObserver = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] web, _ in
            DispatchQueue.main.async {
                self?.progress.progress = Float(web.estimatedProgress)
                self?.progress.isHidden = web.estimatedProgress >= 0.99
            }
        }

        // iOS WebKit handles standard <input type=file> pickers and camera.
        webView.load(URLRequest(url: website, cachePolicy: .useProtocolCachePolicy))
    }

    private func isTrusted(_ url: URL) -> Bool {
        url.scheme?.lowercased() == "https" && url.host?.lowercased() == allowedHost
    }

    private func openExternal(_ url: URL) {
        UIApplication.shared.open(url, options: [:], completionHandler: nil)
    }

    @objc private func reload() {
        offline.isHidden = true
        if webView.url == nil { webView.load(URLRequest(url: website)) }
        else { webView.reload() }
    }

    private func fail() {
        progress.isHidden = true
        refresh.endRefreshing()
        offline.isHidden = false
    }

    // Keep the whole Mercadito inside the app. Hand out-of-domain links
    // (WhatsApp, payment, mailto, other websites) to the system.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else {
            decisionHandler(.cancel)
            return
        }
        if isTrusted(url) || url.scheme == "about" || url.scheme == "blob" {
            decisionHandler(action.shouldPerformDownload ? .download : .allow)
            return
        }
        if action.navigationType == .linkActivated || action.targetFrame == nil {
            openExternal(url)
        }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = navigationAction.request.url {
            if isTrusted(url) { webView.load(URLRequest(url: url)) }
            else { openExternal(url) }
        }
        return nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        refresh.endRefreshing()
        offline.isHidden = true
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { fail() }
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        if (error as NSError).code != NSURLErrorCancelled { fail() }
    }

    func webView(_ webView: WKWebView, decidePolicyFor response: WKNavigationResponse,
                 decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        if let http = response.response as? HTTPURLResponse, http.statusCode >= 500, response.isForMainFrame {
            fail()
            decisionHandler(.cancel)
        } else {
            decisionHandler(response.canShowMIMEType ? .allow : .download)
        }
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    // Only top-frame JS from our own HTTPS origin may request native sharing.
    // Child frames and third-party origins are never trusted.
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "MercaditoBridge",
              message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "https",
              message.frameInfo.securityOrigin.host == allowedHost,
              let command = message.body as? [String: Any],
              let action = command["type"] as? String,
              action == "share" || action == "download" else { return }

        if let file = command["file"] as? [String: Any],
           let dataUrl = file["dataUrl"] as? String,
           dataUrl.utf8.count <= 11_500_000,
           let encoded = dataUrl.split(separator: ",", maxSplits: 1, omittingEmptySubsequences: false).last,
           let data = Data(base64Encoded: String(encoded), options: .ignoreUnknownCharacters),
           data.count <= 8 * 1024 * 1024 {
            let raw = ((file["filename"] as? String) ?? "mercaditotec-qr.png" as String).components(separatedBy: "/").last ?? "mercaditotec-qr.png"
            let safe = String(raw.prefix(100).map { character in
                (character.isLetter || character.isNumber || character == "." || character == "-" || character == "_")
                    ? character : "_"
            })
            let destination = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString + "-" + (safe.isEmpty ? "mercaditotec-qr.png" : safe))
            do {
                try data.write(to: destination, options: .atomic)
                presentShareSheet(items: [destination])
            } catch {
                showFileError()
            }
            return
        }

        if action == "share" {
            let parts = [command["title"], command["text"], command["url"]]
                .compactMap { $0 as? String }.filter { !$0.isEmpty }
            presentShareSheet(items: [parts.joined(separator: "\n")])
        }
    }

    private func presentShareSheet(items: [Any]) {
        let share = UIActivityViewController(activityItems: items, applicationActivities: nil)
        share.popoverPresentationController?.sourceView = view
        present(share, animated: true)
    }

    private func showFileError() {
        let alert = UIAlertController(
            title: "MercaditoTec",
            message: "No se pudo preparar el archivo para compartir.",
            preferredStyle: .alert
        )
        alert.addAction(UIAlertAction(title: "Aceptar", style: .default))
        present(alert, animated: true)
    }

    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let safeName = (suggestedFilename as NSString).lastPathComponent
        let destination = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString + "-" + safeName)
        lastDownloadedFile = destination
        completionHandler(destination)
    }

    func downloadDidFinish(_ download: WKDownload) {
        guard let file = lastDownloadedFile else { return }
        let share = UIActivityViewController(activityItems: [file], applicationActivities: nil)
        share.popoverPresentationController?.sourceView = view
        present(share, animated: true)
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        lastDownloadedFile = nil
    }
}
