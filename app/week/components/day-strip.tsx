"use client"

import { useState } from "react"
import { ArrowUp, Check, Minus } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { dayDetail, type WeekDay } from "@/lib/week"
import { dayDots, dayDotsSummary, type DayStatus, type WinsData } from "@/lib/wins"
import { cn } from "@/lib/utils"

// Faixa dos 7 dias no herói. Estado = cor + FORMA do ícone (✓ dentro, ↑
// acima, – sem gasto, contorno tracejado = futuro): verde × âmbar ficam
// colados para deuteranopia e abaixo de 3:1 sobre o card (validado com o
// validate_palette.js da skill dataviz), então a cor nunca trabalha sozinha.
// Ícones escuros sobre o preenchimento claro em qualquer tema; anel interno
// sutil destaca o círculo do card. Legenda visível + resumo para leitor de tela.
const DOT: Record<DayStatus, string> = {
  UNDER: "bg-income ring-1 ring-inset ring-black/10",
  OVER: "bg-amber-400 ring-1 ring-inset ring-black/10",
  NO_SPEND: "bg-muted ring-1 ring-inset ring-border",
  FUTURE: "border border-dashed border-muted-foreground/50",
}

// Variante discreta (Home): tudo neutro, o estado fica só na forma do ícone.
const DOT_QUIET: Record<DayStatus, string> = {
  UNDER: "bg-foreground/10 ring-1 ring-inset ring-border",
  OVER: "bg-foreground/10 ring-1 ring-inset ring-border",
  NO_SPEND: "ring-1 ring-inset ring-border",
  FUTURE: "border border-dashed border-muted-foreground/40",
}

function DotIcon({ status, quiet }: { status: DayStatus; quiet: boolean }) {
  const ink = quiet ? "text-foreground/80" : "text-black/75"
  if (status === "UNDER") return <Check size={12} weight="bold" className={ink} aria-hidden />
  if (status === "OVER") return <ArrowUp size={12} weight="bold" className={ink} aria-hidden />
  if (status === "NO_SPEND") return <Minus size={12} weight="bold" className="text-muted-foreground" aria-hidden />
  return null
}

interface DayStripProps {
  days: WinsData["week"]["dayStatus"]
  todayISO: string
  // Gasto de cada dia (da semana), para o valor ao tocar numa bolinha.
  spending: WeekDay[]
  idealPerDay: number
  // Acima do ritmo: o valor por dia da frase de recuperação (vale para hoje).
  recoveryPerDay?: number | null
  // Sem as cores de estado (Home, abaixo do herói).
  quiet?: boolean
}

// Tocar numa bolinha mostra o valor daquele dia logo abaixo; começa em hoje.
export function DayStrip({ days, todayISO, spending, idealPerDay, recoveryPerDay = null, quiet = false }: DayStripProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const dots = dayDots(days, todayISO)
  if (dots.length === 0) return null
  const present = new Set(dots.map((d) => d.status))
  const activeDate = selected ?? dots.find((d) => d.isToday)?.date ?? null
  const detail = dayDetail(
    spending.find((d) => d.date === activeDate),
    idealPerDay,
    formatCurrency,
    activeDate === todayISO ? recoveryPerDay : null,
  )

  return (
    <figure className="m-0">
      <ol className="flex items-start justify-between gap-1" aria-label={dayDotsSummary(dots)}>
        {dots.map((d) => {
          const isFuture = d.status === "FUTURE"
          return (
            <li key={d.date} className="flex flex-1 justify-center">
              <button
                type="button"
                disabled={isFuture}
                onClick={() => setSelected(d.date)}
                aria-pressed={d.date === activeDate}
                aria-label={d.label}
                className="flex flex-col items-center gap-1 rounded-lg p-0.5 disabled:cursor-default"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full",
                    (quiet ? DOT_QUIET : DOT)[d.status],
                    d.isToday && "outline outline-2 outline-offset-2 outline-foreground/70",
                    d.date === activeDate && !d.isToday && "outline outline-2 outline-offset-2 outline-foreground/30",
                  )}
                  aria-hidden
                >
                  <DotIcon status={d.status} quiet={quiet} />
                </span>
                <span aria-hidden className={cn("text-[11px] leading-none", d.isToday ? "font-bold text-foreground" : "text-muted-foreground")}>
                  {d.letter}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
      {detail && (
        <p className="mt-2.5 text-xs font-medium text-foreground tabular-nums" aria-live="polite">
          {detail}
        </p>
      )}
      <figcaption className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-hidden>
        {present.has("UNDER") && (
          <span className="inline-flex items-center gap-1">
            <Check size={10} weight="bold" className={quiet ? undefined : "text-positive-ink"} /> dentro do ideal
          </span>
        )}
        {present.has("OVER") && (
          <span className="inline-flex items-center gap-1">
            <ArrowUp size={10} weight="bold" className={quiet ? undefined : "text-attention-ink"} /> acima do ideal
          </span>
        )}
        {present.has("NO_SPEND") && (
          <span className="inline-flex items-center gap-1">
            <Minus size={10} weight="bold" /> sem gasto
          </span>
        )}
      </figcaption>
    </figure>
  )
}
