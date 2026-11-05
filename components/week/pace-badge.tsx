"use client"

import { Equals, TrendDown, TrendUp, WarningCircle } from "@phosphor-icons/react"
import { paceBadge, type PaceStatus } from "@/lib/week"
import { cn } from "@/lib/utils"

// Fundo tingido + ícone na cor do estado; o texto fica na cor de texto
// (verde/vermelho como texto perdem contraste no tema claro).
const TONE = {
  good: "bg-income/15 text-foreground",
  neutral: "bg-muted text-muted-foreground",
  over: "bg-amber-400/20 text-foreground",
  exceeded: "bg-expense/15 text-foreground",
} as const

// "Acima do ritmo" é atenção (âmbar), não estouro: vermelho fica para quando o
// limite já passou. Mesma cor da barra do herói (lib/week.ts → heroBarTone).
const ICON_TONE = { good: "text-positive-ink", neutral: "", over: "text-attention-ink", exceeded: "text-expense" } as const

const ICON = { good: TrendDown, neutral: Equals, over: TrendUp, exceeded: WarningCircle } as const

// Selo do ritmo da semana: ícone + texto (nunca só a cor).
export function PaceBadge({ status, exceeded = false, className }: { status: PaceStatus; exceeded?: boolean; className?: string }) {
  const badge = paceBadge(status, exceeded)
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
