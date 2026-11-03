"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { WarningCircle } from "@phosphor-icons/react"
import { formatMoneyWhole, formatShortfall, monthBarSpentCaption, type MonthBar as MonthBarData, type MonthBarSegment } from "@/lib/plan-layout"
import { cn } from "@/lib/utils"
import { ColorDot } from "./plan-ui"

interface MonthBarProps {
  bar: MonthBarData
  summary: string
  // Plano confirmado e período começado: tom forte até o gasto real.
  showSpending: boolean
  groupHref: (groupId: string) => string
  className?: string
}

// Hachura do excesso (45°/135°, como a textura da skill dataviz).
const OVER_HATCH =
  "repeating-linear-gradient(135deg, color-mix(in oklab, var(--expense) 70%, transparent) 0 3px, transparent 3px 7px)"

// A torre de verdade: uma barra com o orçamento inteiro, um segmento por
// grupo (cor fixa por kind), o gasto sem categoria em cinza, os desejos e o
// que fica livre (o próprio fundo). A soma passando do orçamento aparece como
// hachura vermelha no fim. O resumo em texto vai no aria-label; a lista
// "Para onde vai" logo abaixo é a versão navegável por teclado.
export function MonthBar({ bar, summary, showSpending, groupHref, className }: MonthBarProps) {
  const router = useRouter()
  const [hovered, setHovered] = useState<string | null>(null)
  const segments = bar.segments
  const active = segments.find((s) => s.key === hovered) ?? null

  const open = (s: MonthBarSegment) => {
    if (s.type === "uncategorized") return router.push("/inbox")
    if (s.kind === "WISHES") {
      document.getElementById("desejos")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }
    if (s.type === "group" && s.groupId) router.push(groupHref(s.groupId))
  }

  return (
    <div className={className}>
      <div className="relative">
        {active && <SegmentTooltip segment={active} scale={bar.scale} showSpending={showSpending} />}

        <div role="img" aria-label={summary} className="relative flex h-6 gap-[2px]" onMouseLeave={() => setHovered(null)}>
          {segments.length === 0 && <span className="flex-1 rounded-[6px]" style={{ backgroundColor: "var(--plan-track)" }} />}
          {segments.map((s, i) => {
            const clickable = s.type !== "free"
            const tinted = showSpending && s.type === "group"
            return (
              <span
                key={s.key}
                onMouseEnter={() => setHovered(s.key)}
                onClick={clickable ? () => open(s) : undefined}
                className={cn(
                  "relative h-full min-w-[3px] overflow-hidden transition-opacity duration-200",
                  i === 0 && "rounded-l-[6px]",
                  i === segments.length - 1 && "rounded-r-[6px]",
                  clickable && "cursor-pointer",
                  hovered && hovered !== s.key && "opacity-45",
                )}
                style={{
                  flexGrow: s.amount,
                  flexBasis: 0,
                  boxShadow: showSpending && s.overspent ? "inset -3px 0 0 var(--expense)" : undefined,
                }}
              >
                <span
                  className="absolute inset-0"
                  style={{ backgroundColor: s.color ?? "var(--plan-track)", opacity: tinted ? "var(--plan-tint)" : 1 }}
                />
                {tinted && s.spentPct > 0 && (
                  <span
                    className="absolute inset-y-0 left-0 transition-[width] duration-500"
                    style={{ width: `${s.spentPct}%`, backgroundColor: s.color ?? undefined }}
                  />
                )}
              </span>
            )
          })}

          {bar.over > 0 && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 rounded-r-[6px]"
              style={{ left: `${bar.budgetPct}%`, background: OVER_HATCH, boxShadow: "inset 0 0 0 1.5px var(--expense)" }}
            />
          )}
        </div>
      </div>

      {bar.over > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-expense">
          <WarningCircle size={14} weight="fill" className="shrink-0" />O plano passa {formatShortfall(bar.over)} do orçamento
        </p>
      )}

      {showSpending && segments.length > 0 && (
        <p className="mt-2 text-xs font-medium text-foreground/80 tabular-nums">{monthBarSpentCaption(bar)}</p>
      )}

      {segments.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-hidden>
          {segments.map((s) => (
            <li
              key={s.key}
              className="flex items-center gap-1.5"
              onMouseEnter={() => setHovered(s.key)}
              onMouseLeave={() => setHovered(null)}
            >
              <ColorDot color={s.color} className="w-2 h-2" />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SegmentTooltip({ segment, scale, showSpending }: { segment: MonthBarSegment; scale: number; showSpending: boolean }) {
  const center = segment.startPct + segment.widthPct / 2
  const share = scale > 0 ? Math.round((segment.amount / scale) * 100) : 0
  return (
    <div
      className="pointer-events-none absolute bottom-full mb-2 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg border border-border bg-popover px-2.5 py-1.5 text-xs shadow-md"
      style={{ left: `${Math.min(85, Math.max(15, center))}%` }}
    >
      <span className="flex items-center gap-1.5 font-medium text-foreground">
        <ColorDot color={segment.color} className="w-2 h-2" />
        {segment.label}
        <span className="tabular-nums">{formatMoneyWhole(segment.amount)}</span>
        <span className="font-normal text-muted-foreground">· {share}%</span>
      </span>
      {showSpending && segment.type === "group" && (
        <span className="block mt-0.5 text-muted-foreground tabular-nums">{formatMoneyWhole(segment.spent)} gasto</span>
      )}
    </div>
  )
}
