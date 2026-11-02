"use client"

import { ArrowUp, Check, Minus } from "@phosphor-icons/react"
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

function DotIcon({ status }: { status: DayStatus }) {
  if (status === "UNDER") return <Check size={12} weight="bold" className="text-black/75" aria-hidden />
  if (status === "OVER") return <ArrowUp size={12} weight="bold" className="text-black/75" aria-hidden />
  if (status === "NO_SPEND") return <Minus size={12} weight="bold" className="text-muted-foreground" aria-hidden />
  return null
}

export function DayStrip({ days, todayISO }: { days: WinsData["week"]["dayStatus"]; todayISO: string }) {
  const dots = dayDots(days, todayISO)
  if (dots.length === 0) return null
  const present = new Set(dots.map((d) => d.status))

  return (
    <figure className="m-0">
      <ol className="flex items-start justify-between gap-1" aria-label={dayDotsSummary(dots)}>
        {dots.map((d) => (
          <li key={d.date} className="flex flex-1 flex-col items-center gap-1" aria-label={d.label}>
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                DOT[d.status],
                d.isToday && "outline outline-2 outline-offset-2 outline-foreground/70",
              )}
              aria-hidden
            >
              <DotIcon status={d.status} />
            </span>
            <span aria-hidden className={cn("text-[11px] leading-none", d.isToday ? "font-bold text-foreground" : "text-muted-foreground")}>
              {d.letter}
            </span>
          </li>
        ))}
      </ol>
      <figcaption className="mt-2.5 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground" aria-hidden>
        {present.has("UNDER") && (
          <span className="inline-flex items-center gap-1">
            <Check size={10} weight="bold" className="text-positive-ink" /> dentro do ideal
          </span>
        )}
        {present.has("OVER") && (
          <span className="inline-flex items-center gap-1">
            <ArrowUp size={10} weight="bold" className="text-attention-ink" /> acima do ideal
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
