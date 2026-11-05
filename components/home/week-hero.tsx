"use client"

import Link from "next/link"
import { CaretRight, Target } from "@phosphor-icons/react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/date-utils"
import { formatWeekday, type WeekData } from "@/lib/week"
import type { WinsData } from "@/lib/wins"
import { homeToday } from "@/lib/home"
import { trackEvent } from "@/lib/events"

interface WeekHeroProps {
  week: WeekData | null
  isLoading: boolean
  isCouple: boolean
  recovery?: WinsData["week"]["recovery"]
}

// Nível 1 da Home — daqui pra frente, na ordem em que se pergunta: quanto dá
// para gastar hoje, quanto até o fim da semana e o que fazer. Acima do ritmo,
// o valor de hoje é o de recuperação (o mesmo da Minha semana). O que já foi
// gasto fica mais abaixo.
export function WeekHero({ week, isLoading, isCouple, recovery = null }: WeekHeroProps) {
  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy>
        <Skeleton className="h-4 w-44 rounded-full" />
        <Skeleton className="h-12 w-56 rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-full" />
      </div>
    )
  }
  if (!week) return null

  if (!week.enabled) {
    if (isCouple) return null
    return (
      <Link href="/plan" className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <Target size={16} weight="duotone" className="mt-0.5 shrink-0 text-foreground/60" />
        <span className="flex-1">Ligue o limite semanal no plano para saber quanto dá para gastar até domingo.</span>
        <CaretRight size={12} weight="bold" className="mt-1 shrink-0" />
      </Link>
    )
  }

  const { today, state, overBy } = homeToday(week, recovery)
  const until = formatWeekday(week.weekEnd)

  // Uma cor só: o valor de hoje fica sempre neutro; o vermelho aparece apenas
  // na linha que diz quanto a semana passou do limite.
  return (
    <section aria-labelledby="home-week-label">
      <Link href="/week" onClick={() => trackEvent("home_week_opened")} className="group block">
        <p id="home-week-label" className="text-sm text-muted-foreground">
          {isCouple ? "Casal · " : ""}Para gastar hoje
        </p>
        <p className="mt-1 flex items-center gap-2 text-5xl font-semibold tracking-tight leading-none tabular-nums text-foreground">
          {formatCurrency(today)}
          <CaretRight size={18} weight="bold" className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </p>
        <p className="mt-3 text-base tabular-nums">
          {state === "exceeded" ? (
            <span className="font-medium text-expense">Passou {formatCurrency(overBy)} do limite da semana</span>
          ) : state === "used" ? (
            <span className="font-medium text-foreground">O limite da semana acabou</span>
          ) : (
            <>
              <span className="font-semibold text-foreground">{formatCurrency(week.available)}</span>
              <span className="text-muted-foreground"> até {until}</span>
            </>
          )}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {state === "exceeded" || state === "used"
            ? `Segure os gastos até ${until}.`
            : state === "recover"
              ? "Segurando nesse valor por dia, a semana fecha no limite."
              : week.daysLeftInWeek <= 1
                ? "Último dia da semana."
                : `O mesmo valor por dia nos próximos ${week.daysLeftInWeek} dias.`}
        </p>
      </Link>
    </section>
  )
}
