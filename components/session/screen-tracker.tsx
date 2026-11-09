"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { trackEvent } from "@/lib/events"
import { screenKey } from "@/lib/screens"

// Uma "tela vista" por navegação (só o nome da tela, nunca ids da URL), para
// o admin saber o que as pessoas mais acessam.
export function ScreenTracker() {
  const pathname = usePathname()
  const last = useRef<string | null>(null)

  useEffect(() => {
    if (!getCurrentUser()) return
    const screen = screenKey(pathname)
    if (!screen || screen === last.current) return
    last.current = screen
    trackEvent("screen_viewed", { screen })
  }, [pathname])

  return null
}
