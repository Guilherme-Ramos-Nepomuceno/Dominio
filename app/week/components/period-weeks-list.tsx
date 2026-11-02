"use client"

import { Check, Triangle } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { weekRows, type PeriodWeek } from "@/lib/week"
import { cn } from "@/lib/utils"

// Uma linha por semana do mês: limite, gasto e a diferença com ícone + texto.
export function PeriodWeeksList({ weeks }: { weeks: PeriodWeek[] }) {
  const rows = weekRows(weeks, formatCurrency)
  if (rows.length === 0) return null

  return (
    <div className="space-y-2">
      <ul className="space-y-1">
        {rows.map((row) => (
          <li
            key={row.key}
            aria-current={row.kind === "current" ? "true" : undefined}
            className={cn(
              "grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 py-2.5 px-3 -mx-3 rounded-xl",
              row.kind === "current" && "bg-primary/5 ring-1 ring-primary/20",
            )}
          >
            <p className={cn("text-sm font-medium", row.kind === "future" ? "text-muted-foreground" : "text-foreground")}>
              {row.title}
              {row.kind === "current" && <span className="ml-2 text-[11px] font-semibold text-primary">atual</span>}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{row.range}</span>
            </p>
            <p
              className={cn(
                "flex items-center justify-end gap-1 text-xs font-semibold tabular-nums",
                row.kind === "under" || row.kind === "over" ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {row.kind === "under" && <Check size={12} weight="bold" className="text-income" aria-label="dentro do limite" />}
              {row.kind === "over" && <Triangle size={10} weight="fill" className="text-expense" aria-label="estourou o limite" />}
              {row.diffText}
            </p>
            <p className="col-span-2 text-xs text-muted-foreground tabular-nums">
              {row.kind === "future" ? (
                <>limite previsto {row.limitText}</>
              ) : (
                <>
                  gasto <span className="text-foreground font-medium">{row.spentText}</span> de {row.limitText}
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">Gastar a mais numa semana diminui o limite das próximas.</p>
    </div>
  )
}
