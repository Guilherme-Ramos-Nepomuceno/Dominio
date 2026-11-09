"use client"

import { useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { weekLabel } from "@/lib/admin-insights"

// Gráficos do admin: série única e neutra (ADR-013 — cor só onde há
// significado). Barras com ponta arredondada presa à base, valor no hover e
// tabela para leitor de tela.

export function WeeklyActiveChart({ weeks }: { weeks: Array<{ weekStart: string; active: number; newUsers: number }> }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...weeks.map((w) => w.active))
  const last = weeks.length - 1
  const shown = hover ?? last
  const focus = weeks[shown]

  return (
    <div>
      {/* Leitura do ponto em foco (hover ou a semana atual). */}
      <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
        {focus ? (
          <>
            <span className="font-medium text-foreground">Semana de {weekLabel(focus.weekStart)}</span>
            {shown === last ? " (atual)" : ""}: {focus.active} {focus.active === 1 ? "ativa" : "ativas"} · {focus.newUsers}{" "}
            {focus.newUsers === 1 ? "nova" : "novas"}
          </>
        ) : (
          "Sem dados ainda."
        )}
      </p>
      <div className="mt-4 flex h-40 items-end gap-2" onMouseLeave={() => setHover(null)} aria-hidden>
        {weeks.map((w, i) => (
          <button
            key={w.weekStart}
            type="button"
            tabIndex={-1}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onClick={() => setHover(i)}
            className="group flex h-full flex-1 flex-col justify-end"
          >
            <span
              className={cn(
                "block w-full rounded-t-[4px] transition-colors",
                i === shown ? "bg-foreground/80" : "bg-foreground/35 group-hover:bg-foreground/55",
              )}
              style={{ height: `${Math.max(2, (w.active / max) * 100)}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-2 border-t border-border pt-2" aria-hidden>
        {weeks.map((w, i) => (
          <div key={w.weekStart} className="flex-1 text-center">
            <p className={cn("text-[11px] tabular-nums", i === shown ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {weekLabel(w.weekStart)}
            </p>
            <p className="text-[10px] tabular-nums text-muted-foreground">{w.newUsers > 0 ? `+${w.newUsers}` : "·"}</p>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Embaixo de cada semana: pessoas novas.</p>
      <table className="sr-only">
        <caption>Pessoas ativas e novas por semana</caption>
        <thead>
          <tr>
            <th>Semana</th>
            <th>Ativas</th>
            <th>Novas</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.weekStart}>
              <td>{weekLabel(w.weekStart)}</td>
              <td>{w.active}</td>
              <td>{w.newUsers}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Lista com barra horizontal: rótulo, barra proporcional ao maior valor e o
// número. `detail` é a linha pequena embaixo.
export function BarList({
  items,
  emptyText,
}: {
  items: Array<{ key: string; label: ReactNode; value: number; valueLabel?: string; detail?: ReactNode; emphasis?: boolean }>
  emptyText: string
}) {
  if (items.length === 0) return <p className="py-3 text-sm text-muted-foreground">{emptyText}</p>
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.key} className="py-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className={cn("min-w-0 truncate text-sm", item.emphasis ? "font-semibold text-foreground" : "font-medium text-foreground")}>
              {item.label}
            </span>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{item.valueLabel ?? item.value}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--plan-track)" }}>
            <div className="h-full rounded-full bg-foreground/45" style={{ width: `${(item.value / max) * 100}%` }} />
          </div>
          {item.detail && <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">{item.detail}</p>}
        </li>
      ))}
    </ul>
  )
}
