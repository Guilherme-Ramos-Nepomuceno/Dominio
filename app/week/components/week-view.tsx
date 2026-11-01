"use client"

import Link from "next/link"
import { ArrowClockwise, CaretRight, Fire, Target, TrendDown, TrendUp, Tray, CalendarX, Equals } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { daysLeftLabel, formatWeekRange, formatWeekday, paceMessage, streakLabel } from "@/lib/week"
import { findCategory, UNCATEGORIZED_LABEL } from "@/lib/category-utils"
import { cn } from "@/lib/utils"
import { useWeekViewModel } from "../hooks/use-week-view-model"

const TONE_BAR = { ok: "bg-income", warning: "bg-amber-500", over: "bg-expense" } as const

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
        <div className="max-w-2xl mx-auto space-y-3">
          <Skeleton className="h-44 rounded-[20px]" />
          <Skeleton className="h-16 rounded-[20px]" />
          <Skeleton className="h-48 rounded-[20px]" />
        </div>
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
                <span className="block text-xs text-muted-foreground">Por enquanto, a base é a sua meta de gastos. Planeje para um limite sob medida.</span>
              </span>
              <CaretRight size={14} weight="bold" className="text-muted-foreground shrink-0" />
            </Link>
          )}

          {/* Número principal */}
          <section className="rounded-[20px] bg-card border border-border/50 p-6 text-center" aria-label="Disponível na semana">
            <p className="text-sm text-muted-foreground">Disponível até {formatWeekday(week.weekEnd)}</p>
            <p
              className={cn(
                "mt-1 text-5xl font-bold tabular-nums tracking-tight",
                week.available < 0 ? "text-expense" : "text-foreground",
              )}
            >
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
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-[width] duration-500", TONE_BAR[vm.progress.tone])}
                    style={{ width: `${vm.progress.pct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(week.spentThisWeek)} gastos de {formatCurrency(week.limit)} da semana
                </p>
              </div>
            )}
          </section>

          {/* Ritmo do mês e sequência */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(() => {
              const pace = paceMessage(week.monthPace.projectedDiff, formatCurrency)
              const Icon = pace.tone === "ok" ? TrendDown : pace.tone === "over" ? TrendUp : Equals
              return (
                <div className="flex items-start gap-3 rounded-[20px] bg-card border border-border/50 p-4">
                  <Icon
                    size={22}
                    weight="bold"
                    className={cn("shrink-0", pace.tone === "ok" ? "text-income" : pace.tone === "over" ? "text-expense" : "text-muted-foreground")}
                  />
                  <p className="text-sm text-foreground">{pace.text}</p>
                </div>
              )
            })()}
            <div className="flex items-center gap-3 rounded-[20px] bg-card border border-border/50 p-4">
              <Fire size={22} weight={week.streak > 0 ? "fill" : "regular"} className={week.streak > 0 ? "text-amber-500" : "text-muted-foreground"} />
              <p className="text-sm text-foreground">{streakLabel(week.streak) ?? "Termine a semana dentro do limite para começar uma sequência."}</p>
            </div>
          </div>

          {/* Gastos da semana */}
          <section className="space-y-2" aria-label="Gastos da semana">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-lg font-bold">Gastos da semana</h2>
              {vm.transactions.uncategorized > 0 && (
                <Link href="/inbox" className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline">
                  <Tray size={14} weight="bold" />
                  Classificar {vm.transactions.uncategorized}
                </Link>
              )}
            </div>
            {vm.transactions.list.length === 0 ? (
              <div className="rounded-[20px] bg-card p-6 text-center border border-border/50">
                <p className="text-sm text-muted-foreground">Nenhum gasto que conta no limite nesta semana.</p>
              </div>
            ) : (
              <ul className="rounded-[20px] bg-card border border-border/50 divide-y divide-border/50">
                {vm.transactions.list.map((t) => {
                  const category = findCategory(vm.categories, t.categoryId)
                  return (
                    <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: category?.color ?? "transparent", border: category ? undefined : "1.5px dashed #9ca3af" }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{t.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.date)} ·{" "}
                          {category ? (
                            category.name
                          ) : (
                            <Link href="/inbox" className="font-medium text-amber-700 dark:text-amber-400 hover:underline">
                              {UNCATEGORIZED_LABEL}
                            </Link>
                          )}
                        </p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums shrink-0">{formatCurrency(t.amount)}</p>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </AppLayout>
  )
}
