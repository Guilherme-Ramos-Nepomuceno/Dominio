"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowClockwise, CaretRight, Fire, Target, TrendDown, TrendUp, CalendarX, Equals, ClockCounterClockwise } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { PaceBadge } from "@/components/week/pace-badge"
import { formatCurrency } from "@/lib/date-utils"
import { daysLeftLabel, formatWeekRange, formatWeekday, lastWeekLabel, projectionMessage, streakLabel } from "@/lib/week"
import { cn } from "@/lib/utils"
import { useWeekViewModel } from "../hooks/use-week-view-model"
import { WeekDaysChart } from "./week-days-chart"
import { MonthProjectionChart } from "./month-projection-chart"
import { PeriodWeeksList } from "./period-weeks-list"
import { WeekCategories } from "./week-categories"

const TONE_BAR = { ok: "bg-income", warning: "bg-amber-500", over: "bg-expense" } as const

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
      <Skeleton className="h-52 rounded-[20px]" />
      <Skeleton className="h-60 rounded-[20px]" />
      <Skeleton className="h-72 rounded-[20px]" />
      <Skeleton className="h-56 rounded-[20px]" />
      <Skeleton className="h-40 rounded-[20px]" />
    </div>
  )
}

export function WeekView() {
  const vm = useWeekViewModel()
  const week = vm.week

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
        <div className="max-w-2xl mx-auto rounded-[20px] bg-card p-8 text-center border border-border/50 space-y-3">
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
      ) : (
        <div className="max-w-2xl mx-auto space-y-4 pb-6">
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

          {/* 1. Hero */}
          <section className="rounded-[20px] bg-card border border-border/50 p-6 text-center" aria-label="Disponível na semana">
            <div className="flex justify-center">
              <PaceBadge status={week.paceStatus} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Disponível até {formatWeekday(week.weekEnd)}</p>
            <p className={cn("mt-1 text-5xl font-bold tracking-tight", week.available < 0 ? "text-expense" : "text-foreground")}>
              {formatCurrency(week.available)}
            </p>
            {week.available > 0 ? (
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

            {vm.progress && (
              <div className="mt-5 text-left">
                <div
                  className="h-3 rounded-full bg-muted overflow-hidden"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(vm.progress.pct)}
                  aria-label="Gasto da semana em relação ao limite"
                >
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-500", TONE_BAR[vm.progress.tone])}
                    style={{ width: `${vm.progress.pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(week.spentThisWeek)} gastos de {formatCurrency(week.limit)} da semana
                  {week.expectedSpentToDate > 0 && <> · o esperado até hoje era {formatCurrency(week.expectedSpentToDate)}</>}
                </p>
              </div>
            )}
          </section>

          {/* 2. Esta semana */}
          <Card title="Esta semana" subtitle="Quanto saiu em cada dia, perto do ideal diário do limite">
            <WeekDaysChart bars={vm.bars} idealPerDay={week.idealPerDay} />
          </Card>

          {/* 3. Projeção do mês */}
          <Card
            title="Projeção do mês"
            subtitle={week.hasPlan ? "Gasto variável acumulado × o planejado" : "Gasto variável acumulado × a meta mensal (sem plano)"}
          >
            <MonthProjectionChart week={week} />
            {(() => {
              const pace = projectionMessage(week.monthPace, formatCurrency)
              const Icon = pace.tone === "ok" ? TrendDown : pace.tone === "over" ? TrendUp : Equals
              return (
                <p className="mt-3 flex items-start gap-2 text-sm text-foreground">
                  <Icon
                    size={18}
                    weight="bold"
                    aria-hidden
                    className={cn(
                      "shrink-0 mt-0.5",
                      pace.tone === "ok" ? "text-income" : pace.tone === "over" ? "text-expense" : "text-muted-foreground",
                    )}
                  />
                  {pace.text}
                </p>
              )
            })()}
          </Card>

          {/* 4. Semanas do mês */}
          <Card title="Semanas do mês">
            <PeriodWeeksList weeks={week.weeks} />
          </Card>

          {/* 5. Para onde foi */}
          <Card title="Para onde foi" subtitle="Gastos desta semana que contam no limite, por categoria">
            <WeekCategories categories={week.categories} />
          </Card>

          {/* 6. Resumo */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3" aria-label="Resumo">
            <div className="flex items-center gap-3 rounded-[20px] bg-card border border-border/50 p-4">
              <Fire
                size={22}
                weight={week.streak > 0 ? "fill" : "regular"}
                aria-hidden
                className={week.streak > 0 ? "text-amber-500 shrink-0" : "text-muted-foreground shrink-0"}
              />
              <p className="text-sm text-foreground">{streakLabel(week.streak) ?? "Termine a semana dentro do limite para começar uma sequência."}</p>
            </div>
            <div className="flex items-center gap-3 rounded-[20px] bg-card border border-border/50 p-4">
              <ClockCounterClockwise size={22} weight="bold" aria-hidden className="text-muted-foreground shrink-0" />
              <p className="text-sm text-foreground tabular-nums">
                {lastWeekLabel(week.lastWeek, formatCurrency) ?? "Ainda não há uma semana passada para comparar."}
              </p>
            </div>
          </section>
        </div>
      )}
    </AppLayout>
  )
}
