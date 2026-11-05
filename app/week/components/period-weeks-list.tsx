"use client"

import { useState } from "react"
import { Check, Triangle } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { formatMoneyWhole } from "@/lib/plan-layout"
import { weekPills, type PeriodWeek } from "@/lib/week"
import { cn } from "@/lib/utils"

// Semanas do mês como uma faixa compacta: uma pílula por semana (✓ dentro,
// ▲ acima, a atual com anel, futuras tracejadas) com o limite embaixo. Tocar mostra o detalhe
// daquela semana logo abaixo; começa na semana atual.
export function PeriodWeeksList({ weeks }: { weeks: PeriodWeek[] }) {
  const pills = weekPills(weeks, formatCurrency)
  const currentKey = pills.find((p) => p.kind === "current")?.key ?? pills[0]?.key ?? null
  const [selected, setSelected] = useState<string | null>(null)
  if (pills.length === 0) return null
  const active = pills.find((p) => p.key === (selected ?? currentKey)) ?? null

  return (
    <div className="space-y-3">
      <div className="flex gap-2" role="group" aria-label="Semanas do mês">
        {pills.map((p) => {
          const isSelected = p.key === active?.key
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setSelected(p.key)}
              aria-pressed={isSelected}
              aria-label={p.ariaLabel}
              aria-current={p.kind === "current" ? "true" : undefined}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span
                className={cn(
                  "flex h-9 w-full items-center justify-center gap-1 rounded-full text-xs font-semibold transition-colors",
                  p.kind === "under" && "bg-income/15 text-foreground",
                  p.kind === "over" && "bg-expense/10 text-foreground",
                  p.kind === "current" && "bg-primary/5 text-foreground ring-1 ring-inset ring-primary/40",
                  p.kind === "future" && "border border-dashed border-border text-muted-foreground",
                  isSelected && "outline outline-2 outline-offset-2 outline-foreground/60",
                )}
              >
                {p.short}
                {p.kind === "under" && <Check size={12} weight="bold" className="text-positive-ink" aria-hidden />}
                {p.kind === "over" && <Triangle size={9} weight="fill" className="text-expense" aria-hidden />}
              </span>
              <span aria-hidden className="text-[11px] tabular-nums text-muted-foreground">
                {formatMoneyWhole(p.limit)}
              </span>
            </button>
          )
        })}
      </div>
      {active && (
        <p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
          {active.detail}
        </p>
      )}
    </div>
  )
}
