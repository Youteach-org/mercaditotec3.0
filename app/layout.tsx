import type { Metadata } from "next";
import { Geist, Geist_Mono, Kalam, Permanent_Marker } from "next/font/google";

import ClientAppShell from "@/components/ClientAppShell";
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
  description: "MercaditoTec",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
  },
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
        <ClientAppShell>{children}</ClientAppShell>
      </body>
    </html>
  );
}
