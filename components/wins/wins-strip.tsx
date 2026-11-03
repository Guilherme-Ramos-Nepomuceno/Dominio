"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  CalendarCheck,
  CaretRight,
  CheckCircle,
  Fire,
  Gift,
  PencilSimpleLine,
  PiggyBank,
  ShoppingBagOpen,
  Sparkle,
  Tray,
  Trophy,
  type Icon,
} from "@phosphor-icons/react"
import { oncePerSession, trackEvent } from "@/lib/events"
import { WIN_ICON, isQuietWin, winsEncouragement, type Win, type WinIcon } from "@/lib/wins"
import { cn } from "@/lib/utils"

const ICONS: Record<WinIcon, Icon> = {
  check: CheckCircle,
  trophy: Trophy,
  flame: Fire,
  piggy: PiggyBank,
  pencil: PencilSimpleLine,
  tray: Tray,
  gift: Gift,
  calendar: CalendarCheck,
  bag: ShoppingBagOpen,
}

interface WinsStripProps {
  wins: Win[]
  scope: "week" | "month"
  hasPlan: boolean
  /** Chave do período, para contar a visualização uma vez por sessão. */
  periodKey: string
  className?: string
}

// "Suas vitórias": até 3 cartões compactos (ícone + título + detalhe). No
// celular, uma faixa horizontal que rola com snap (o primeiro cartão cabe
// inteiro e o próximo aparece pela metade, sinalizando que há mais); a
// partir de sm, lado a lado. Sem vitória, um cartão neutro de incentivo —
// nunca uma comemoração inventada.
export function WinsStrip({ wins, scope, hasPlan, periodKey, className }: WinsStripProps) {
  useEffect(() => {
    if (wins.length === 0) return
    oncePerSession(`wins_viewed:${scope}:${periodKey}`, () => trackEvent("wins_viewed", { count: wins.length, scope }))
  }, [wins.length, scope, periodKey])

  if (wins.length === 0) {
    const tip = winsEncouragement(scope, hasPlan)
    const body = (
      <>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <Sparkle size={18} weight="duotone" className="text-muted-foreground" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">{tip.title}</span>
          <span className="block text-xs text-muted-foreground">{tip.detail}</span>
        </span>
        {tip.href && <CaretRight size={14} weight="bold" className="shrink-0 text-muted-foreground" aria-hidden />}
      </>
    )
    return (
      <section aria-label="Suas vitórias" className={className}>
        {tip.href ? (
          <Link href={tip.href} className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-3.5 hover:border-primary/40 transition-colors">
            {body}
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-card p-3.5">{body}</div>
        )}
      </section>
    )
  }

  if (isQuietWin(wins)) {
    const win = wins[0]
    const IconCmp = ICONS[WIN_ICON[win.kind]]
    return (
      <section aria-label="Suas vitórias" className={className}>
        <p className="flex items-center gap-2 text-sm text-foreground/85">
          <IconCmp size={16} weight="fill" className="shrink-0 text-positive-ink" aria-hidden />
          <span className="min-w-0">
            <span className="font-medium text-foreground">{win.title}</span>
            {win.detail && <span className="text-muted-foreground"> · {win.detail}</span>}
          </span>
        </p>
      </section>
    )
  }

  const single = wins.length === 1
  return (
    <section aria-labelledby={`wins-title-${scope}`} className={className}>
      <h2 id={`wins-title-${scope}`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Suas vitórias
      </h2>
      <ul
        className={cn(
          single
            ? "block"
            : "-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:overflow-visible sm:px-0 sm:pb-0",
          !single && (wins.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"),
        )}
      >
        {wins.map((win, i) => {
          const IconCmp = ICONS[WIN_ICON[win.kind]]
          return (
            <li
              key={win.id}
              style={{ animationDelay: `${i * 90}ms` }}
              className={cn(
                "flex items-start gap-3 rounded-2xl border border-income/25 bg-income/[0.07] p-3.5",
                "animate-in fade-in slide-in-from-bottom-1 [animation-fill-mode:both] duration-500 motion-reduce:animate-none",
                !single && "w-[15.5rem] shrink-0 snap-start sm:w-auto",
              )}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-income/20">
                <IconCmp size={18} weight="fill" className="text-positive-ink" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold leading-snug text-foreground">{win.title}</span>
                {win.detail && <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">{win.detail}</span>}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
