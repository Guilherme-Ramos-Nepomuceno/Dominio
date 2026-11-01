import type { MetadataRoute } from "next"

// Manifesto do PWA: permite instalar o Domínio na tela inicial (no iPhone é
// isso que libera as notificações push, iOS 16.4+).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Domínio",
    short_name: "Domínio",
    description: "Controle financeiro pessoal: plano do mês, semana e desejos.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#18181e",
    theme_color: "#18181e",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
