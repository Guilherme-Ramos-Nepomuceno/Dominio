import type React from "react"
import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthGuard } from "@/components/auth/auth-guard"
import { AccountProvider } from "@/components/account/account-context"
import { Toaster } from "@/components/ui/toaster"
import "./globals.css"

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "Dominio - Controle Financeiro Pessoal",
  description: "Gerencie suas finanças pessoais com previsibilidade e controle total",
  generator: "Guilherme.Ramos",
  icons: {
    icon: "/icon.png",
  },
}

// viewport-fit: "cover" faz o conteúdo se estender por trás do notch/home indicator
// nos iPhones e habilita os valores de env(safe-area-inset-*) no CSS (sem isso eles
// sempre retornam 0). Necessário para o padding de segurança do BottomNav funcionar.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${fontSans.className} ${fontSans.variable} antialiased`}>
        <AuthGuard>
          <AccountProvider>{children}</AccountProvider>
        </AuthGuard>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
