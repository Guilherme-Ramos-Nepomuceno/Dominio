"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowClockwise, CaretRight, Fire, Target, TrendDown, TrendUp, CalendarX, Equals, ClockCounterClockwise, Path } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { PaceBadge } from "@/components/week/pace-badge"
import { WinsStrip } from "@/components/wins/wins-strip"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { formatCurrency } from "@/lib/date-utils"
import {
  daysLeftLabel,
  formatWeekRange,
  carryOverOverLine,
  carryOverSummary,
  formatWeekday,
  isWeekExceeded,
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

function Section({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  const id = `week-${title.toLowerCase().replace(/[^a-z]+/g, "-")}`
  return (
    <section aria-labelledby={id}>
      <SectionTitle id={id}>{title}</SectionTitle>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function WeekSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-12" aria-busy="true" aria-label="Carregando a semana">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40 rounded-full" />
        <Skeleton className="h-12 w-56 rounded-xl" />
        <Skeleton className="h-4 w-64 rounded-full" />
        <Skeleton className="mt-4 h-2 w-full rounded-full" />
      </div>
      <Skeleton className="h-20 w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-3 w-32 rounded-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
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
      <PageHeader back="/"
        title="Minha semana"
        subtitle={week?.weekStart ? formatWeekRange(week.weekStart, week.weekEnd) : "Quanto ainda dá para gastar até domingo"}
      />

      {vm.isReadOnly ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">A semana de um parceiro não aparece por aqui.</p>
        </div>
      ) : vm.isLoading ? (
        <WeekSkeleton />
      ) : vm.loadError || !week ? (
        <div className="py-12 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Não foi possível carregar sua semana agora.</p>
          <button type="button" onClick={vm.reload} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowClockwise size={14} weight="bold" />
            Tentar de novo
          </button>
        </div>
      ) : !week.enabled ? (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="py-10 text-center space-y-3">
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
        // Página corrida, no desenho do Planejar: herói solto e seções com
        // título, sem um cartão em volta de cada parte. pb extra: o fim da
        // página nunca fica embaixo do botão "+" flutuante.
        <div className="max-w-2xl mx-auto space-y-12 pb-24 md:pb-20">
          {!week.hasPlan && (
            <Link href="/plan" className="group -mb-4 flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Target size={16} weight="duotone" className="mt-0.5 shrink-0 text-foreground/60" />
              <span className="flex-1">
                Os números abaixo vêm da meta mensal. <span className="font-medium text-foreground">Planeje o mês</span> para um limite sob medida.
              </span>
              <CaretRight size={12} weight="bold" className="mt-1 shrink-0" />
            </Link>
          )}

          {/* 1. Herói: quanto dá para gastar até o fim da semana, o ritmo, os dias e a barra */}
          <section aria-labelledby="week-hero-label">
            <div className="flex items-center justify-between gap-3">
              <p id="week-hero-label" className="text-sm text-muted-foreground">
                Disponível até {formatWeekday(week.weekEnd)}
              </p>
              <PaceBadge status={week.paceStatus} exceeded={isWeekExceeded(week)} />
            </div>
            <p
              className={cn(
                "mt-1 text-5xl font-semibold tracking-tight leading-none tabular-nums",
                week.available < 0 ? "text-expense" : "text-foreground",
              )}
            >
              {formatCurrency(week.available)}
            </p>
            {/* Acima do ritmo, a frase de recuperação toma o lugar do "por dia":
                um valor diário só, e o que dá para fazer com ele. */}
            {week.available > 0 && recovery ? (
              <p className="mt-3 flex items-start gap-2 text-sm text-foreground">
                <Path size={16} weight="bold" aria-hidden className="mt-0.5 shrink-0 text-attention-ink" />
                {recovery}
              </p>
            ) : week.available > 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{formatCurrency(week.perDayRemaining)} por dia</span> ·{" "}
                {daysLeftLabel(week.daysLeftInWeek)}
              </p>
            ) : (
              <p className="mt-3 text-sm text-expense">
                {week.available < 0 ? "A semana passou do limite." : "O limite da semana acabou."} Segure os gastos até{" "}
                {formatWeekday(week.weekEnd)}.
                {week.available < 0 && <span className="mt-1 block text-muted-foreground">{carryOverOverLine(week.carryOver)}</span>}
              </p>
            )}

            {vm.progress && (
              <div className="mt-6">
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ backgroundColor: "var(--plan-track)" }}
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

            {wins && wins.week.dayStatus.length > 0 && (
              <div className="mt-6">
                <DayStrip
                  days={wins.week.dayStatus}
                  todayISO={vm.todayISO}
                  spending={week.days}
                  idealPerDay={week.idealPerDay}
                  recoveryPerDay={week.available > 0 ? (wins.week.recovery?.perDayToRecover ?? null) : 0}
                />
              </div>
            )}
          </section>

          {/* 2. Fechamento da semana (último dia, dentro do limite) */}
          {wins?.week.weekClosed && <WeekClosedCard closed={wins.week.weekClosed} weekEnd={week.weekEnd} />}

          {/* 3. Vitórias + sequência e semana passada, juntas */}
          {wins && (
            <div className="space-y-3">
              <WinsStrip wins={wins.week.wins} scope="week" hasPlan={week.hasPlan} periodKey={week.weekStart} />
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Resumo">
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

          {/* 5. Projeção do mês */}
          {(() => {
            const pace = projectionMessage(week.monthPace, formatCurrency)
            const Icon = pace.tone === "ok" ? TrendDown : pace.tone === "over" ? TrendUp : Equals
            return (
              <Section
                title="Projeção do mês"
                subtitle={
                  showChart
                    ? week.hasPlan
                      ? "Gasto variável acumulado × o planejado"
                      : "Gasto variável acumulado × a meta mensal (sem plano)"
                    : undefined
                }
              >
                <p className="flex items-start gap-2 text-sm text-foreground">
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
                {/* Poucos dias de gasto: só a frase, sem um gráfico quase vazio. */}
                {showChart && (
                  <div className="mt-4">
                    <MonthProjectionChart week={week} />
                  </div>
                )}
              </Section>
            )
          })()}

          {/* 6. Semanas do mês */}
          <Section
            title="Semanas do mês"
            subtitle={
              <>
                {carryOverSummary(week.carryOver)}{" "}
                <Link href="/settings#semanas" className="font-medium text-foreground underline-offset-2 hover:underline">
                  Mudar
                </Link>
              </>
            }
          >
            <PeriodWeeksList weeks={week.weeks} />
          </Section>

          {/* 7. Para onde foi */}
          <Section title="Para onde foi" subtitle="Gastos desta semana que contam no limite, por categoria">
            <WeekCategories categories={week.categories} />
          </Section>
        </div>
      )}
    </AppLayout>
  )
}
