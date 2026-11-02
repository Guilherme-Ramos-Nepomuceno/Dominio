"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Gift, Target, Trophy } from "@phosphor-icons/react"
import { oncePerSession, trackEvent } from "@/lib/events"
import { weekClosedCelebration, type WinsData } from "@/lib/wins"

// Último dia da semana dentro do limite: comemoração discreta (o cartão
// aparece com fade e o troféu "assenta" com uma escala curta) e para onde
// mandar a sobra. Não há API de aporte em desejo — "desejo" leva para a
// lista de desejos do plano; "objetivo" para os objetivos.
export function WeekClosedCard({ closed, weekEnd }: { closed: WinsData["week"]["weekClosed"]; weekEnd: string }) {
  const celebration = weekClosedCelebration(closed)
  const show = !!celebration

  useEffect(() => {
    if (show) oncePerSession(`week_closed_celebrated:${weekEnd}`, () => trackEvent("week_closed_celebrated"))
  }, [show, weekEnd])

  if (!celebration) return null
  const hasLeftover = (closed?.leftover ?? 0) >= 1

  return (
    <section
      aria-label={celebration.title}
      className="rounded-[20px] border border-income/30 bg-income/[0.08] p-5 animate-in fade-in zoom-in-95 duration-500 motion-reduce:animate-none"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-income/25 animate-in zoom-in-50 duration-700 motion-reduce:animate-none">
          <Trophy size={22} weight="fill" className="text-positive-ink" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">{celebration.title}</h2>
          <p className="text-sm text-muted-foreground tabular-nums">{celebration.detail}</p>
        </div>
      </div>
      {hasLeftover && (
        <div className="mt-4 grid grid-cols-1 gap-2 min-[380px]:grid-cols-2">
          <Link
            href="/plan#desejos"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-background"
          >
            <Gift size={16} weight="bold" aria-hidden />
            Mandar para um desejo
          </Link>
          <Link
            href="/goals"
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-foreground/5"
          >
            <Target size={16} weight="bold" aria-hidden />
            Mandar para um objetivo
          </Link>
        </div>
      )}
    </section>
  )
}
