"use client"

import { Equals, TrendDown, TrendUp } from "@phosphor-icons/react"
import { paceBadge, type PaceStatus } from "@/lib/week"
import { cn } from "@/lib/utils"

// Fundo tingido + ícone na cor do estado; o texto fica na cor de texto
// (verde/vermelho como texto perdem contraste no tema claro).
const TONE = {
  good: "bg-income/15 text-foreground",
  neutral: "bg-muted text-muted-foreground",
  over: "bg-expense/15 text-foreground",
} as const

const ICON_TONE = { good: "text-income", neutral: "", over: "text-expense" } as const

const ICON = { good: TrendDown, neutral: Equals, over: TrendUp } as const

// Selo do ritmo da semana: ícone + texto (nunca só a cor).
export function PaceBadge({ status, className }: { status: PaceStatus; className?: string }) {
  const badge = paceBadge(status)
  const Icon = ICON[badge.tone]
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", TONE[badge.tone], className)}
      title={`Você está ${badge.hint}`}
    >
      <Icon size={12} weight="bold" className={ICON_TONE[badge.tone]} aria-hidden />
      {badge.label}
    </span>
  )
}
