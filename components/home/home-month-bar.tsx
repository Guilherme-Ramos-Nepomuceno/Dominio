"use client"

import { useState } from "react"
import Link from "next/link"
import { CaretRight } from "@phosphor-icons/react"
import { ColorDot } from "@/app/plan/components/plan-ui"
import { formatMoneyWhole, segmentDetail, type MonthBar, type MonthBarSegment } from "@/lib/plan-layout"
import { cn } from "@/lib/utils"

interface HomeMonthBarProps {
  bar: MonthBar
  // Plano confirmado: tom forte até o gasto real de cada grupo.
  showSpending: boolean
  // Linha de baixo quando nada está selecionado (a sobra prevista).
  idleCaption: React.ReactNode
  // Cinza até tocar/passar o mouse; aí os grupos ganham as cores. Grupo
  // estourado fica vermelho mesmo em cinza (é o único aviso).
  monochrome?: boolean
}

// A barra do mês da Home, com identificação: passar o mouse mostra um balão
// com o grupo; tocar fixa o pedaço (ele cresce e os outros apagam) e mostra
// embaixo o nome, o gasto × planejado e o link para o detalhe. Tocar de novo
// solta. Cada pedaço é um botão, então também funciona no teclado.
export function HomeMonthBar({ bar, showSpending, idleCaption, monochrome = false }: HomeMonthBarProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const segments = bar.segments
  const active = segments.find((s) => s.key === (selected ?? hovered)) ?? null
  const hoverOnly = !selected && hovered ? segments.find((s) => s.key === hovered) ?? null : null

  return (
    <div>
      <div className="relative">
        {hoverOnly && <SegmentBubble segment={hoverOnly} />}
        <div className="flex h-3 items-center gap-[2px]" role="group" aria-label="Para onde vai o orçamento do mês" onMouseLeave={() => setHovered(null)}>
          {segments.map((s, i) => {
            const isActive = active?.key === s.key
            const tinted = showSpending && s.type === "group"
            const gray = monochrome && !active
            const paint = !gray || !s.color ? s.color : s.overspent && showSpending ? "var(--expense)" : "var(--muted-foreground)"
            return (
              <button
                key={s.key}
                type="button"
                aria-pressed={selected === s.key}
                aria-label={`${s.label}: ${segmentDetail(s, showSpending).text}`}
                onMouseEnter={() => setHovered(s.key)}
                onFocus={() => setHovered(s.key)}
                onBlur={() => setHovered(null)}
                onClick={() => setSelected((cur) => (cur === s.key ? null : s.key))}
                className={cn(
                  "relative h-full overflow-hidden transition-[transform,opacity] duration-300 ease-out origin-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground/60",
                  i === 0 && "rounded-l-[4px]",
                  i === segments.length - 1 && "rounded-r-[4px]",
                  isActive && "scale-y-[1.7] rounded-[3px]",
                  active && !isActive && "opacity-35",
                )}
                style={{ flexGrow: s.amount, flexBasis: 0, minWidth: 4 }}
              >
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: paint ?? "var(--plan-track)", opacity: tinted ? "var(--plan-tint)" : gray && paint ? 0.5 : 1 }}
                />
                {tinted && s.spentPct > 0 && (
                  <span className="absolute inset-y-0 left-0" style={{ width: `${s.spentPct}%`, backgroundColor: paint ?? undefined }} />
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-2 min-h-5 text-xs tabular-nums">
        {selected && active ? (
          <SegmentLine key={active.key} segment={active} showSpending={showSpending} />
        ) : (
          <p className="text-muted-foreground">{idleCaption}</p>
        )}
      </div>
    </div>
  )
}

// Linha de identificação embaixo da barra (pedaço fixado por toque/clique).
function SegmentLine({ segment, showSpending }: { segment: MonthBarSegment; showSpending: boolean }) {
  const detail = segmentDetail(segment, showSpending)
  const body = (
    <>
      <ColorDot color={segment.color} className="w-2 h-2" />
      <span className="font-semibold text-foreground">{segment.label}</span>
      <span className={cn("text-muted-foreground", segment.overspent && showSpending && "text-expense")}>{detail.text}</span>
      {detail.href && <CaretRight size={11} weight="bold" className="ml-auto text-muted-foreground shrink-0" />}
    </>
  )
  const className =
    "flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1 duration-300 motion-reduce:animate-none"
  return detail.href ? (
    <Link href={detail.href} className={cn(className, "hover:opacity-80")}>
      {body}
    </Link>
  ) : (
    <p className={className}>{body}</p>
  )
}

// Balão de hover (desktop), acima do pedaço, sem sair das bordas da barra.
function SegmentBubble({ segment }: { segment: MonthBarSegment }) {
  const center = segment.startPct + segment.widthPct / 2
  return (
    <div
      className="pointer-events-none absolute bottom-full z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md animate-in fade-in zoom-in-95 duration-150"
      style={{ left: `${Math.min(85, Math.max(15, center))}%` }}
    >
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        <ColorDot color={segment.color} className="w-2 h-2" />
        {segment.label}
        <span className="tabular-nums">{formatMoneyWhole(segment.amount)}</span>
      </span>
    </div>
  )
}
