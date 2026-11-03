"use client"

import Link from "next/link"
import { CaretRight, Check, Equals, TrendUp } from "@phosphor-icons/react"
import type { Plan } from "@/lib/plan"
import {
  formatMoneyWhole,
  monthBar,
  monthBarSummary,
  planHeadline,
  spentProgress,
  type MonthBar as MonthBarData,
} from "@/lib/plan-layout"
import { groupStatusLabel, vsLastMonthHint, type WinsData } from "@/lib/wins"
import { cn } from "@/lib/utils"
import { MonthBar } from "./month-bar"
import { ColorDot, SectionTitle, SpentBar } from "./plan-ui"

interface PlanGroupListProps {
  plan: Plan
  bar: MonthBarData
  groupHref: (groupId: string) => string
  className?: string
  /** Status de cada grupo (só exibido com o plano confirmado/fechado). */
  groupStatus?: WinsData["month"]["groupStatus"]
  /** Diferença do variável planejado para o mês anterior, por grupo. */
  vsLastMonth?: WinsData["month"]["vsLastMonth"]
}

const STATUS_ICON = { good: Check, neutral: Equals, over: TrendUp } as const
const STATUS_ICON_TONE = { good: "text-positive-ink", neutral: "text-muted-foreground", over: "text-expense" } as const

// "Para onde vai": uma linha leve por grupo, na mesma ordem e cor da barra do
// mês — nome, planejado (sem centavos) e a barrinha gasto/planejado. O
// detalhe (comprometido × variável) fica no detalhe do grupo.
export function PlanGroupList({ plan, bar, groupHref, className, groupStatus, vsLastMonth }: PlanGroupListProps) {
  const byId = new Map(plan.groups.map((g) => [g.id, g]))
  const showStatus = plan.status === "CONFIRMED" || plan.status === "CLOSED"
  const statusById = new Map((groupStatus ?? []).map((g) => [g.groupId, g]))
  const diffById = new Map((vsLastMonth ?? []).map((g) => [g.groupId, g.plannedDiff]))
  // Desejos ficam fora: a barra do mês já mostra a parte deles e a seção de
  // desejos logo abaixo é o lugar de mexer neles.
  const rows = bar.segments.filter((s) => s.type !== "free" && s.kind !== "WISHES")

  return (
    <section className={cn("space-y-1", className)} aria-labelledby="plan-groups-title">
      <SectionTitle id="plan-groups-title">Para onde vai</SectionTitle>
      <ul className="divide-y divide-border">
        {rows.map((s) => {
          if (s.type === "uncategorized") {
            return (
              <li key={s.key}>
                <Link href="/inbox" className="group flex items-center gap-3 py-3.5">
                  <ColorDot color={s.color} />
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">{s.label}</span>
                  <span className="text-sm tabular-nums text-foreground">
                    {formatMoneyWhole(s.amount)}
                    <span className="text-muted-foreground"> · </span>
                    <span className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 group-hover:decoration-foreground">
                      classificar
                    </span>
                  </span>
                  <CaretRight size={14} weight="bold" className="text-muted-foreground/60 shrink-0" />
                </Link>
              </li>
            )
          }

          const group = s.groupId ? byId.get(s.groupId) : undefined
          const href = groupHref(s.groupId ?? "")
          const planned = group?.planned ?? s.amount
          const spent = group?.spent ?? 0
          const progress = spentProgress(spent, planned)
          const status = showStatus && s.groupId ? groupStatusLabel(statusById.get(s.groupId)) : null
          const hint = s.groupId ? vsLastMonthHint(diffById.get(s.groupId), plan.month) : null
          const StatusIcon = status ? STATUS_ICON[status.tone] : null
          return (
            <li key={s.key}>
              <Link href={href} className="group flex items-center gap-3 py-3.5">
                <ColorDot color={s.color} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-foreground">{s.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{formatMoneyWhole(planned)}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <SpentBar spent={spent} planned={planned} color={s.color ?? "var(--plan-uncategorized)"} className="flex-1" />
                    <span
                      className={cn(
                        "w-24 shrink-0 text-right text-[11px] tabular-nums",
                        progress.over ? "font-medium text-expense" : "text-muted-foreground",
                      )}
                    >
                      {progress.over ? `${formatMoneyWhole(progress.overAmount)} acima` : `${formatMoneyWhole(spent)} gasto`}
                    </span>
                  </div>
                  {(status || hint) && (
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      {status && StatusIcon && (
                        <span className={cn("inline-flex items-center gap-1", status.tone === "good" && "font-medium text-foreground/85")}>
                          <StatusIcon size={11} weight="bold" className={STATUS_ICON_TONE[status.tone]} aria-hidden />
                          <span className="tabular-nums">{status.text}</span>
                        </span>
                      )}
                      {status && hint && <span aria-hidden>·</span>}
                      {hint && <span className="tabular-nums">{hint}</span>}
                    </p>
                  )}
                </div>
                <CaretRight
                  size={14}
                  weight="bold"
                  className="text-muted-foreground/60 shrink-0 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

interface PlanTowerProps {
  plan: Plan
  groupHref: (groupId: string) => string
}

// Versão compacta (onboarding): barra do mês, "para onde vai" e a sobra.
export function PlanTower({ plan, groupHref }: PlanTowerProps) {
  const bar = monthBar(plan)
  const headline = planHeadline(plan)
  return (
    <div className="space-y-6">
      <MonthBar bar={bar} summary={monthBarSummary(bar)} showSpending={false} groupHref={groupHref} />
      <PlanGroupList plan={plan} bar={bar} groupHref={groupHref} />
      <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <span className="text-sm text-muted-foreground">{headline.label}</span>
        <span className={cn("text-lg font-semibold tabular-nums", headline.negative ? "text-expense" : "text-foreground")}>
          {formatMoneyWhole(headline.value)}
        </span>
      </div>
      {headline.shortfallText && <p className="-mt-4 text-xs text-expense">{headline.shortfallText}</p>}
    </div>
  )
}
