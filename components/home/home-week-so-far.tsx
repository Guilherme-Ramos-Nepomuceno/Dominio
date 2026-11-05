"use client"

import Link from "next/link"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { DayStrip } from "@/app/week/components/day-strip"
import { formatCurrency } from "@/lib/date-utils"
import type { WeekData } from "@/lib/week"
import type { WinsData } from "@/lib/wins"
import { weekBarSplit } from "@/lib/home"

// Até aqui, na semana: quanto já saiu do limite e como foi cada dia. Em tom
// neutro para não disputar com o herói — só o trecho que passou do limite
// fica vermelho; as cores fortes ficam na Minha semana. Abre /week.
export function HomeWeekSoFar({ week, wins, todayISO }: { week: WeekData; wins: WinsData | null; todayISO: string }) {
  if (!week.enabled) return null
  const bar = weekBarSplit(week.spentThisWeek, week.limit)
  return (
    <section aria-labelledby="home-week-so-far-title">
      <Link href="/week" className="block">
        <div className="flex items-baseline justify-between gap-3">
          <SectionTitle id="home-week-so-far-title">Esta semana até hoje</SectionTitle>
          <span className="text-sm tabular-nums">
            <span className="font-semibold text-foreground">{formatCurrency(week.spentThisWeek)}</span>
            <span className="text-muted-foreground"> de {formatCurrency(week.limit)}</span>
          </span>
        </div>
        <div className="mt-3 flex h-1.5 gap-[2px] rounded-full overflow-hidden" style={{ backgroundColor: "var(--plan-track)" }} aria-hidden>
          <div className="h-full bg-foreground/45 transition-[width] duration-500" style={{ width: `${bar.withinPct}%` }} />
          {bar.overPct > 0 && <div className="h-full bg-expense transition-[width] duration-500" style={{ width: `${bar.overPct}%` }} />}
        </div>
      </Link>
      {wins && wins.week.dayStatus.length > 0 && (
        <div className="mt-4">
          <DayStrip
            days={wins.week.dayStatus}
            todayISO={todayISO}
            spending={week.days}
            idealPerDay={week.idealPerDay}
            recoveryPerDay={week.available > 0 ? (wins.week.recovery?.perDayToRecover ?? null) : 0}
            quiet
          />
        </div>
      )}
    </section>
  )
}
