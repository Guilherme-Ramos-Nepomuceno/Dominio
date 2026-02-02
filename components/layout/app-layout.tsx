"use client"

import type { ReactNode } from "react"
import { BottomNav } from "./bottom-nav"
import { DesktopNav } from "./desktop-nav"

interface AppLayoutProps {
  children: ReactNode
}

// Add imports
import { NotificationCenter } from "@/components/notifications/notification-center"
import { usePathname } from "next/navigation"

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  // Hide header on login page if needed, although AuthGuard handles it.

  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />

      {/* Mobile Top Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-md border-b border-border z-40 flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <h1 className="font-bold text-lg text-foreground">Dominio</h1>
        </div>
        {/* Could add other actions here */}
      </div>

      {/* Main content */}
      <main className="pb-24 pt-2 md:pt-0 md:pb-8 md:pl-64 mt-16 md:mt-0">
        <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8">{children}</div>
      </main>

      <BottomNav />
    </div>
  )
}
