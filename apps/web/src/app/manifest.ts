import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cash Tracker",
    short_name: "Cash",
    description: "Controle suas entradas e saídas.",
    start_url: "/visao-geral",
    scope: "/",
    display: "standalone",
    background_color: "#0B0F0E",
    theme_color: "#0B0F0E",
    lang: "pt-BR",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
