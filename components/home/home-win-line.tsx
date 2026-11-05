"use client"

import Link from "next/link"
import { CaretRight, CheckCircle } from "@phosphor-icons/react"
import type { Win } from "@/lib/wins"

// A vitória do momento na Home: a primeira da semana, numa linha que abre
// Minha semana. Sem vitória não aparece (o incentivo neutro fica nas telas).
export function HomeWinLine({ wins }: { wins: Win[] }) {
  const win = wins[0]
  if (!win) return null
  return (
    <Link href="/week" className="flex items-center gap-2 px-1 text-sm text-foreground/85 hover:text-foreground transition-colors">
      <CheckCircle size={16} weight="fill" className="shrink-0 text-positive-ink" aria-hidden />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-medium text-foreground">{win.title}</span>
        {win.detail && <span className="text-muted-foreground"> · {win.detail}</span>}
      </span>
      <CaretRight size={12} weight="bold" className="shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  )
}
