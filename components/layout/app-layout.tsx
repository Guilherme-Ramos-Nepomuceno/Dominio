"use client"

import type { ReactNode } from "react"
import { BottomNav } from "./bottom-nav"
import { DesktopNav } from "./desktop-nav"

interface AppLayoutProps {
  children: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <DesktopNav />

      {/* Main content */}
      <main className="pb-24 md:pb-8 md:pl-64">
        <div className="container max-w-7xl mx-auto px-4 py-6 md:py-8">{children}</div>
      </main>

      <BottomNav />
    </div>
  )
}
