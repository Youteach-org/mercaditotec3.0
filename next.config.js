/** @type {import('next').NextConfig} */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The certificate is valid, but the domain previously served plaintext
  // http://mercaditotec.store/chat with 200 OK instead of redirecting.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: "object-src 'none'; base-uri 'self'; frame-ancestors 'none'; upgrade-insecure-requests",
  },
];

const nextConfig = {
  allowedDevOrigins: ["192.168.1.2"],
  serverExternalPackages: ["jose"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
      {
        // Static prerendered marketplace HTML is identical for every visitor;
        // React loads the session and stores client-side. Edge caching saves CPU.
        source: "/marketplace",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=120, stale-while-revalidate=180" },
        ],
      },
      {
        source: "/marketplace/:path*",
        headers: [
          ...SECURITY_HEADERS,
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
