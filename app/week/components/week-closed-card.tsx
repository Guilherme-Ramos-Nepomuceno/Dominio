"use client"

import { useEffect } from "react"
import Link from "next/link"
import { CircleNotch, Gift, PiggyBank, Target, Trophy } from "@phosphor-icons/react"
import { oncePerSession, trackEvent } from "@/lib/events"
import { weekClosedCelebration, type WinsData } from "@/lib/wins"
import { weekSaveLabel } from "@/lib/week"
import { formatMoneyWhole } from "@/lib/plan-layout"
import { useWeekLeftover } from "../hooks/use-week-leftover"

const primaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-background disabled:opacity-60"
const secondaryButton =
  "inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-foreground/5 disabled:opacity-60"

// Último dia da semana dentro do limite: comemoração discreta (o cartão
// aparece com fade e o troféu "assenta" com uma escala curta) e, com um
// toque, para onde vai a sobra: desejos do mês, um objetivo ou uma reserva.
// Guardada, a sobra sai do mês — não engorda o limite das próximas semanas.
export function WeekClosedCard({
  closed,
  weekEnd,
  monthKey,
}: {
  closed: WinsData["week"]["weekClosed"]
  weekEnd: string
  monthKey: string
}) {
  const celebration = weekClosedCelebration(closed)
  const show = !!celebration
  const leftover = useWeekLeftover(monthKey)

  useEffect(() => {
    if (show) oncePerSession(`week_closed_celebrated:${weekEnd}`, () => trackEvent("week_closed_celebrated"))
  }, [show, weekEnd])

  if (!celebration) return null
  const saved = closed?.saved ?? null
  const amount = closed?.leftover ?? 0
  const canSave = !saved && amount >= 1

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

      {saved && (
        <p className="mt-4 text-sm text-foreground tabular-nums" role="status">
          {weekSaveLabel(saved, formatMoneyWhole)}{" "}
          <Link href={saved.destination === "WISH" ? "/plan#desejos" : saved.destination === "GOAL" ? "/goals" : "/savings"} className="font-medium underline underline-offset-2">
            Ver
          </Link>
        </p>
      )}

      {canSave && !leftover.picking && (
        <div className="mt-4 space-y-2">
          <p className="text-sm text-muted-foreground">Guarde a sobra com um toque. Ela sai do mês e não aumenta o limite das próximas semanas.</p>
          <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
            <button type="button" disabled={leftover.isBusy} onClick={() => leftover.save("WISH")} className={primaryButton}>
              {leftover.isBusy ? <CircleNotch size={16} className="animate-spin" aria-hidden /> : <Gift size={16} weight="bold" aria-hidden />}
              Para os desejos
            </button>
            <button type="button" disabled={leftover.isBusy} onClick={() => leftover.pick("GOAL")} className={secondaryButton}>
              <Target size={16} weight="bold" aria-hidden />
              Um objetivo
            </button>
            <button type="button" disabled={leftover.isBusy} onClick={() => leftover.pick("SAVINGS")} className={secondaryButton}>
              <PiggyBank size={16} weight="bold" aria-hidden />
              Uma reserva
            </button>
          </div>
        </div>
      )}

      {canSave && leftover.picking && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium text-foreground">
            Guardar {formatMoneyWhole(amount)} em {leftover.picking === "GOAL" ? "qual objetivo" : "qual reserva"}?
          </p>
          {leftover.targets === null ? (
            <div className="flex justify-center py-3">
              <CircleNotch size={20} className="animate-spin text-muted-foreground" aria-label="Carregando" />
            </div>
          ) : leftover.targets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum{leftover.picking === "GOAL" ? " objetivo cadastrado" : "a reserva cadastrada"} ainda.{" "}
              <Link href={leftover.picking === "GOAL" ? "/goals" : "/savings"} className="font-medium text-foreground underline underline-offset-2">
                Criar agora
              </Link>
            </p>
          ) : (
            <ul className="space-y-1.5">
              {leftover.targets.map((target) => (
                <li key={target.id}>
                  <button
                    type="button"
                    disabled={leftover.isBusy}
                    onClick={() => leftover.save(leftover.picking!, target.id)}
                    className="flex w-full items-center justify-between rounded-xl border border-border bg-background px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-foreground/5 disabled:opacity-60"
                  >
                    <span className="truncate">{target.name}</span>
                    {leftover.isBusy && <CircleNotch size={16} className="animate-spin text-muted-foreground" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={leftover.cancelPick} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Voltar
          </button>
        </div>
      )}
    </section>
  )
}
