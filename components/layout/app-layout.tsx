"use client"

import type { ReactNode } from "react"
import { BottomNav } from "./bottom-nav"
import { DesktopNav } from "./desktop-nav"

interface AppLayoutProps {
  children: ReactNode
}

// Add imports
import { NotificationCenter } from "@/components/notifications/notification-center"
import { AccountSwitcher } from "@/components/account/account-switcher"
import { usePathname } from "next/navigation"

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  // Hide header on login page if needed, although AuthGuard handles it.

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-border z-40 flex items-center px-4 justify-between gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <NotificationCenter />
          <h1 className="font-bold text-lg text-foreground">Dominio</h1>
        </div>
        <div className="flex-1 max-w-[55%]">
          <AccountSwitcher />
        </div>
      </div>

      {/* Main content */}
      {/* pb usa calc() somando a altura do BottomNav (h-16 = 4rem) + folga (2rem) +
          env(safe-area-inset-bottom) para nunca deixar o último elemento do conteúdo
          coberto pelo BottomNav fixo, mesmo em iPhones com home indicator. */}
      <main className="pb-[calc(6rem+env(safe-area-inset-bottom))] pt-2 md:pt-0 md:pb-8 md:pl-64 mt-16 md:mt-0">
        <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8">{children}</div>
      </main>

      <BottomNav />
    </div>
  )
}
