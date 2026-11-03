"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowClockwise, CaretRight, Fire, Target, TrendDown, TrendUp, CalendarX, Equals, ClockCounterClockwise, Path } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { PaceBadge } from "@/components/week/pace-badge"
import { WinsStrip } from "@/components/wins/wins-strip"
import { formatCurrency } from "@/lib/date-utils"
import {
  daysLeftLabel,
  formatWeekRange,
  formatWeekday,
  lastWeekLabel,
  projectionMessage,
  showMonthChart,
  streakLabel,
  type HeroBarTone,
} from "@/lib/week"
import { recoveryMessage } from "@/lib/wins"
import { cn } from "@/lib/utils"
import { useWeekViewModel } from "../hooks/use-week-view-model"
import { MonthProjectionChart } from "./month-projection-chart"
import { PeriodWeeksList } from "./period-weeks-list"
import { WeekCategories } from "./week-categories"
import { DayStrip } from "./day-strip"
import { WeekClosedCard } from "./week-closed-card"
import { WishProgressList } from "./wish-progress-list"

// Barra do herói na cor do estado do ritmo — a mesma do selo acima dela.
const TONE_BAR: Record<HeroBarTone, string> = {
  good: "bg-income",
  neutral: "bg-foreground/45",
  warning: "bg-amber-400",
  over: "bg-expense",
}

function Card({ title, subtitle, children, label }: { title: string; subtitle?: ReactNode; children: ReactNode; label?: string }) {
  return (
    <section className="rounded-[20px] bg-card border border-border/50 p-5" aria-label={label ?? title}>
      <h2 className="text-base font-bold text-foreground">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function WeekSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4" aria-busy="true" aria-label="Carregando a semana">
      <Skeleton className="h-72 rounded-[20px]" />
      <Skeleton className="h-20 rounded-[20px]" />
      <Skeleton className="h-56 rounded-[20px]" />
      <Skeleton className="h-28 rounded-[20px]" />
    </div>
  )
}

export function WeekView() {
  const vm = useWeekViewModel()
  const week = vm.week
  const wins = vm.wins
  const recovery = recoveryMessage(wins?.week.recovery ?? null)
  const showChart = week ? showMonthChart(week.monthSeries) : false

  return (
    <AppLayout>
      <PageHeader
        title="Minha semana"
        subtitle={week?.weekStart ? formatWeekRange(week.weekStart, week.weekEnd) : "Quanto ainda dá para gastar até domingo"}
      />

      {vm.isReadOnly ? (
        <div className="rounded-[20px] bg-card p-8 text-center border border-border/50">
          <p className="text-sm text-muted-foreground">A semana de um parceiro não aparece por aqui.</p>
        </div>
      ) : vm.isLoading ? (
        <WeekSkeleton />
      ) : vm.loadError || !week ? (
        <div className="rounded-[20px] bg-card p-8 text-center border border-border/50 space-y-3">
          <p className="text-sm text-muted-foreground">Não foi possível carregar sua semana agora.</p>
          <button type="button" onClick={vm.reload} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowClockwise size={14} weight="bold" />
            Tentar de novo
          </button>
        </div>
      ) : !week.enabled ? (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="rounded-[20px] bg-card p-8 text-center border border-border/50 space-y-3">
            <CalendarX size={40} weight="duotone" className="mx-auto text-muted-foreground" />
            <h2 className="text-lg font-semibold">Limite semanal desligado</h2>
            <p className="text-sm text-muted-foreground">
              Ligue o limite semanal no plano do mês para ver quanto ainda dá para gastar em cada semana.
            </p>
            <Link href="/plan" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background text-sm font-semibold">
              <Target size={16} weight="bold" />
              Abrir o plano
            </Link>
          </div>
          {wins && wins.week.wins.length > 0 && (
            <WinsStrip wins={wins.week.wins} scope="week" hasPlan={week.hasPlan} periodKey={week.weekStart} />
          )}
        </div>
      ) : (
        // pb extra: o último cartão nunca fica embaixo do botão "+" flutuante.
        <div className="max-w-2xl mx-auto space-y-4 pb-24 md:pb-20">
          {!week.hasPlan && (
            <Link
              href="/plan"
              className="flex items-center gap-3 rounded-[20px] bg-card border border-dashed border-border p-4 hover:border-primary/40 transition-colors"
            >
              <Target size={22} weight="duotone" className="text-muted-foreground shrink-0" />
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium">Você ainda não planejou este mês</span>
                <span className="block text-xs text-muted-foreground">
                  Os números abaixo são baseados na meta mensal. Planeje o mês para um limite sob medida.
                </span>
              </span>
              <span className="text-xs font-semibold text-primary shrink-0">Planejar</span>
              <CaretRight size={14} weight="bold" className="text-muted-foreground shrink-0" />
            </Link>
          )}

          {/* 1. Herói: disponível, ritmo, dias e barra */}
          <section className="rounded-[20px] bg-card border border-border/50 p-6 text-center" aria-label="Disponível na semana">
            <div className="flex justify-center">
              <PaceBadge status={week.paceStatus} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Disponível até {formatWeekday(week.weekEnd)}</p>
            <p className={cn("mt-1 text-5xl font-bold tracking-tight", week.available < 0 ? "text-expense" : "text-foreground")}>
              {formatCurrency(week.available)}
            </p>
            {/* Acima do ritmo, a frase de recuperação toma o lugar do "por dia":
                um valor diário só, e o que dá para fazer com ele. */}
            {week.available > 0 && recovery ? (
              <p className="mx-auto mt-2 flex max-w-sm items-start justify-center gap-2 text-left text-sm text-foreground">
                <Path size={16} weight="bold" aria-hidden className="mt-0.5 shrink-0 text-attention-ink" />
                {recovery}
              </p>
            ) : week.available > 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{formatCurrency(week.perDayRemaining)} por dia</span> ·{" "}
                {daysLeftLabel(week.daysLeftInWeek)}
              </p>
            ) : (
              <p className="mt-2 text-sm text-expense">
                {week.available < 0 ? "A semana passou do limite." : "O limite da semana acabou."} Segure os gastos até{" "}
                {formatWeekday(week.weekEnd)}.
              </p>
            )}

            {wins && wins.week.dayStatus.length > 0 && (
              <div className="mt-5">
                <DayStrip days={wins.week.dayStatus} todayISO={vm.todayISO} spending={week.days} idealPerDay={week.idealPerDay} />
              </div>
            )}

            {vm.progress && (
              <div className="mt-5 text-left">
                <div
                  className="h-2.5 rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(vm.progress.pct)}
                  aria-label="Gasto da semana em relação ao limite"
                >
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-500", TONE_BAR[vm.barTone])}
                    style={{ width: `${vm.progress.pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(week.spentThisWeek)} gastos de {formatCurrency(week.limit)} da semana
                </p>
              </div>
            )}
          </section>

          {/* 2. Fechamento da semana (último dia, dentro do limite) */}
          {wins?.week.weekClosed && <WeekClosedCard closed={wins.week.weekClosed} weekEnd={week.weekEnd} />}

          {/* 3. Vitórias + sequência e semana passada, juntas */}
          {wins && (
            <div className="space-y-2">
              <WinsStrip wins={wins.week.wins} scope="week" hasPlan={week.hasPlan} periodKey={week.weekStart} />
              <ul className="flex flex-wrap gap-x-4 gap-y-1 px-1 text-xs text-muted-foreground" aria-label="Resumo">
                {/* A sequência já aparece como vitória quando é ≥ 2. */}
                {!wins.week.wins.some((w) => w.kind === "WEEKS_STREAK") && (
                  <li className="flex items-center gap-1.5">
                    <Fire size={14} weight={week.streak > 0 ? "fill" : "regular"} aria-hidden className={week.streak > 0 ? "text-attention-ink" : ""} />
                    {streakLabel(week.streak) ?? "Feche a semana no limite para começar uma sequência"}
                  </li>
                )}
                {week.lastWeek && (
                  <li className="flex items-center gap-1.5 tabular-nums">
                    <ClockCounterClockwise size={14} weight="bold" aria-hidden />
                    {lastWeekLabel(week.lastWeek, formatCurrency)}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* 4. Economia que vira desejo */}
          {wins && <WishProgressList items={wins.month.wishProgress} />}

          {/* 5. Projeção do mês — o dia a dia da semana já está nas bolinhas do herói */}
          {(() => {
            const pace = projectionMessage(week.monthPace, formatCurrency)
            const Icon = pace.tone === "ok" ? TrendDown : pace.tone === "over" ? TrendUp : Equals
            const line = (
              <p className={cn("flex items-start gap-2 text-sm text-foreground", showChart && "mt-3")}>
                <Icon
                  size={18}
                  weight="bold"
                  aria-hidden
                  className={cn(
                    "shrink-0 mt-0.5",
                    pace.tone === "ok" ? "text-positive-ink" : pace.tone === "over" ? "text-expense" : "text-muted-foreground",
                  )}
                />
                {pace.text}
              </p>
            )
            // Poucos dias de gasto: só a frase, sem um cartão inteiro de gráfico vazio.
            if (!showChart) {
              return (
                <section className="rounded-[20px] bg-card border border-border/50 px-5 py-4" aria-label="Projeção do mês">
                  {line}
                </section>
              )
            }
            return (
              <Card
                title="Projeção do mês"
                subtitle={week.hasPlan ? "Gasto variável acumulado × o planejado" : "Gasto variável acumulado × a meta mensal (sem plano)"}
              >
                <MonthProjectionChart week={week} />
                {line}
              </Card>
            )
          })()}

          {/* 6. Semanas do mês */}
          <Card title="Semanas do mês">
            <PeriodWeeksList weeks={week.weeks} />
          </Card>

          {/* 7. Para onde foi */}
          <Card title="Para onde foi" subtitle="Gastos desta semana que contam no limite, por categoria">
            <WeekCategories categories={week.categories} />
          </Card>
        </div>
      )}
    </AppLayout>
  )
}
