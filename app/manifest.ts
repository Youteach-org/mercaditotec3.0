import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "MercaditoTec",
    short_name: "MercaditoTec",
    description: "Compra, vende y descubre tiendas de la comunidad MercaditoTec.",
    lang: "es-MX",
    start_url: "/marketplace",
    scope: "/",
    display: "standalone",
    background_color: "#fff9ee",
    theme_color: "#123b83",
    icons: [
      {
        src: "/icons/mercaditotec-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/mercaditotec-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
