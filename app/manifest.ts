import type { MetadataRoute } from "next"
import { BRAND_EXPLANATION, brandIconUrl } from "@/lib/brand"
import { SYSTEM_BAR_COLOR } from "@/lib/theme"

// Manifesto do PWA: permite instalar o Domínio na tela inicial (no iPhone é
// isso que libera as notificações push, iOS 16.4+).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Domínio",
    short_name: "Domínio",
    description: BRAND_EXPLANATION,
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Manifesto só aceita uma cor: a abertura usa o fundo do escuro (a barra
    // depois segue o tema pelo theme-color do layout).
    background_color: SYSTEM_BAR_COLOR.dark,
    theme_color: SYSTEM_BAR_COLOR.dark,
    icons: [
      { src: brandIconUrl("/icons/icon-192.png"), sizes: "192x192", type: "image/png", purpose: "any" },
      { src: brandIconUrl("/icons/icon-512.png"), sizes: "512x512", type: "image/png", purpose: "any" },
      { src: brandIconUrl("/icons/icon-maskable-512.png"), sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}
