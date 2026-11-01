"use client"

import Link from "next/link"
import { CaretRight, CalendarCheck, Target } from "@phosphor-icons/react"
import { useWeek } from "@/hooks/use-week"
import { useAccount } from "@/components/account/account-context"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/date-utils"
import { formatWeekday, weekProgress } from "@/lib/week"
import { cn } from "@/lib/utils"

const TONE_BAR = { ok: "bg-income", warning: "bg-amber-500", over: "bg-expense" } as const

// Primeiro card da Home: quanto ainda dá para gastar nesta semana (abre /week).
// Na conta do casal só aparece com o limite semanal ligado.
export function WeekAvailableCard() {
  const { selection, isReadOnly } = useAccount()
  const { week, isLoading } = useWeek(!isReadOnly)
  const isCouple = selection.type === "couple"

  if (isReadOnly) return null
  if (isLoading) return <Skeleton className="h-28 rounded-[20px]" />
  if (!week) return null

  if (!week.enabled) {
    if (isCouple) return null
    return (
      <Link
        href="/plan"
        className="flex items-center gap-3 px-4 py-3 rounded-[20px] bg-card border border-border/50 hover:border-primary/40 transition-colors"
      >
        <Target size={22} weight="duotone" className="text-muted-foreground shrink-0" />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-foreground">Limite da semana</span>
          <span className="block text-xs text-muted-foreground">Ligue no plano do mês para saber quanto dá para gastar até domingo.</span>
        </span>
        <CaretRight size={14} weight="bold" className="text-muted-foreground shrink-0" />
      </Link>
    )
  }

  const progress = weekProgress(week.spentThisWeek, week.limit)
  return (
    <Link
      href="/week"
      className="block rounded-[20px] bg-card border border-border/50 p-5 hover:border-primary/40 transition-colors"
      aria-label={`Disponível na semana: ${formatCurrency(week.available)}`}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarCheck size={14} weight="bold" />
        <span className="flex-1">
          {isCouple ? "Casal · " : ""}Disponível até {formatWeekday(week.weekEnd)}
        </span>
        <CaretRight size={14} weight="bold" />
      </div>
      <p className={cn("mt-1 text-3xl font-bold tabular-nums", week.available < 0 ? "text-expense" : "text-foreground")}>
        {formatCurrency(week.available)}
      </p>
      <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full", TONE_BAR[progress.tone])} style={{ width: `${progress.pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground tabular-nums">
        {week.available > 0 ? `${formatCurrency(week.perDayRemaining)} por dia · ` : ""}
        {formatCurrency(week.spentThisWeek)} de {formatCurrency(week.limit)}
      </p>
    </Link>
  )
}
