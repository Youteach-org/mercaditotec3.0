import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Kalam, Permanent_Marker } from "next/font/google";

import ClientAppShell from "@/components/ClientAppShell";
import PwaRegistration from "@/components/PwaRegistration";
import "./globals.css";
import "./mercadito-theme.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const marketHand = Kalam({
  variable: "--font-market-hand",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const marketMarker = Permanent_Marker({
  variable: "--font-market-marker",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "MercaditoTec",
  description: "Compra, vende y descubre tiendas en MercaditoTec.",
  applicationName: "MercaditoTec",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MercaditoTec",
    statusBarStyle: "default",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: [{ url: "/icons/mercaditotec-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#123b83",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${marketHand.variable} ${marketMarker.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegistration />
        <ClientAppShell>{children}</ClientAppShell>
      </body>
    </html>
  );
}
