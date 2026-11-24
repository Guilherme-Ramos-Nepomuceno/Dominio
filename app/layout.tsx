import type React from "react"
import type { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthGuard } from "@/components/auth/auth-guard"
import { AccountProvider } from "@/components/account/account-context"
import { SelectedMonthProvider } from "@/lib/selected-month-context"
import { Toaster } from "@/components/ui/toaster"
import { SessionBootstrap } from "@/components/session/session-bootstrap"
import { QueryProvider } from "@/components/session/query-provider"
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register"
import { RulePromptListener } from "@/components/rules/rule-prompt-listener"
import { GuideProvider } from "@/components/guide/guide-provider"
import { ScreenTracker } from "@/components/session/screen-tracker"
import { BRAND_EXPLANATION, BRAND_NAME, BRAND_SIGNATURE, brandIconUrl } from "@/lib/brand"
import { SYSTEM_BAR_COLOR } from "@/lib/theme"
import "./globals.css"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
})

// Fonte de destaque (ADR-030): só no número do dia, nos títulos de tela e na
// marca. A interface continua em Plus Jakarta Sans.
const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: `${BRAND_NAME} · ${BRAND_SIGNATURE}`,
  description: BRAND_EXPLANATION,
  generator: "Guilherme.Ramos",
  // Ícones gerados por scripts/brand-icons.mjs (ADR-030). SVG para quem
  // aceita, favicon.ico para quem pede /favicon.ico direto (salvar favorito
  // ou atalho) e PNG de reserva.
  icons: {
    icon: [
      { url: brandIconUrl("/brand/icon.svg"), type: "image/svg+xml" },
      { url: brandIconUrl("/favicon.ico"), sizes: "16x16 32x32 48x48" },
      { url: brandIconUrl("/icon.png"), type: "image/png", sizes: "256x256" },
    ],
    shortcut: brandIconUrl("/favicon.ico"),
    apple: brandIconUrl("/apple-touch-icon.png"),
  },
  // PWA no iPhone: abre em tela cheia quando adicionado à tela inicial.
  appleWebApp: {
    capable: true,
    title: "Domínio",
    statusBarStyle: "black-translucent",
  },
}

// viewport-fit: "cover" faz o conteúdo se estender por trás do notch/home indicator
// nos iPhones e habilita os valores de env(safe-area-inset-*) no CSS (sem isso eles
// sempre retornam 0). Necessário para o padding de segurança do BottomNav funcionar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: SYSTEM_BAR_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: SYSTEM_BAR_COLOR.dark },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${fontSans.className} ${fontSans.variable} ${fontDisplay.variable} antialiased`}>
        <QueryProvider>
          <AuthGuard>
            <AccountProvider>
              <GuideProvider>
                <SelectedMonthProvider>{children}</SelectedMonthProvider>
              </GuideProvider>
              <SessionBootstrap />
              <ScreenTracker />
              <RulePromptListener />
            </AccountProvider>
          </AuthGuard>
        </QueryProvider>
        <Toaster />
        <ServiceWorkerRegister />
        <Analytics />
      </body>
    </html>
  )
}
