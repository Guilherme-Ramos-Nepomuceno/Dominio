"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { CaretRight, Sparkle } from "@phosphor-icons/react"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { getPlan } from "@/lib/planning-api"
import { parseMonthKey } from "@/lib/period"
import type { Plan } from "@/lib/plan"
import { formatMoneyWhole, monthBar, monthBarPlanned, planHeadline } from "@/lib/plan-layout"
import { trackEvent } from "@/lib/events"
import { cn } from "@/lib/utils"
import { HomeMonthBar } from "./home-month-bar"

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

export type MonthWhen = "current" | "past" | "future"

interface HomeMonthSectionProps {
  monthKey: string
  when: MonthWhen
  // Gasto do mês pelas transações (para o mês passado sem plano).
  spentWithoutPlan: number
}

// O mês na Home. No mês atual é o "até aqui" (nível 2, abaixo da semana):
// quanto já saiu do planejado e a sobra prevista. Em outro mês vira a
// resposta principal da tela (nível 1): como foi o mês passado, ou o convite
// para planejar o próximo. Os números são os do Planejar.
export function HomeMonthSection({ monthKey, when, spentWithoutPlan }: HomeMonthSectionProps) {
  const [plan, setPlan] = useState<Plan | null>(null)
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    try {
      const { year, month } = parseMonthKey(monthKey)
      setPlan(await getPlan(year, month))
      setFailed(false)
    } catch (error) {
      console.error("Falha ao carregar o plano na Home:", error)
      setFailed(true)
    }
  }, [monthKey])

  useEffect(() => {
    load()
    window.addEventListener("plan-update", load)
    window.addEventListener("storage-update", load)
    return () => {
      window.removeEventListener("plan-update", load)
      window.removeEventListener("storage-update", load)
    }
  }, [load])

  // Falha aqui não derruba a Home: a seção só não aparece.
  if (failed) return null
  if (!plan) return <Skeleton className="h-20 rounded-xl" />

  const monthName = MONTH_NAMES[plan.month - 1] ?? ""
  const prominent = when !== "current"
  const title = when === "current" ? `${monthName} até agora` : when === "past" ? `Como foi ${monthName}` : monthName
  const open = () => trackEvent("home_plan_opened")
  const amountClass = cn("font-semibold tracking-tight tabular-nums text-foreground", prominent ? "text-4xl leading-none" : "text-2xl")

  if (plan.status === "NONE") {
    // Mês passado sem plano: o que saiu; atual/futuro: o convite para planejar.
    if (when === "past") {
      return (
        <section aria-labelledby="home-month-title">
          <SectionTitle id="home-month-title">{title}</SectionTitle>
          <p className={cn("mt-2", amountClass)}>{formatMoneyWhole(spentWithoutPlan)} gastos</p>
          <p className="mt-1 text-sm text-muted-foreground">Esse mês não teve plano.</p>
        </section>
      )
    }
    return (
      <section aria-labelledby="home-month-title" className="space-y-3">
        <SectionTitle id="home-month-title">{title}</SectionTitle>
        <Link
          href="/plan"
          onClick={open}
          className={cn(
            "group flex items-center gap-3 transition-colors",
            prominent ? "rounded-2xl border border-border px-4 py-4 hover:border-primary/40" : "text-sm",
          )}
        >
          <Sparkle size={prominent ? 22 : 16} weight="duotone" className="shrink-0 text-foreground/60" />
          <span className="flex-1 min-w-0">
            <span className={cn("block font-semibold text-foreground", prominent && "text-lg")}>Planeje {monthName}</span>
            <span className="block text-sm text-muted-foreground">Decida para onde vai cada real e veja o que cabe nos desejos.</span>
          </span>
          <CaretRight size={14} weight="bold" className="shrink-0 text-muted-foreground" />
        </Link>
      </section>
    )
  }

  const bar = monthBar(plan)
  const headline = planHeadline(plan)
  const settled = plan.status === "CONFIRMED" || plan.status === "CLOSED"
  const spent = bar.segments.filter((s) => s.type !== "free").reduce((sum, s) => sum + s.spent, 0)
  const planned = monthBarPlanned(bar)

  const caption = (
    <>
      {headline.label}{" "}
      <span className={cn("font-semibold", headline.negative ? "text-expense" : "text-foreground")}>
        {formatMoneyWhole(headline.value)}
      </span>
      <span className="text-muted-foreground/70"> · toque na barra para ver os grupos</span>
    </>
  )

  // Mês atual: mesma forma da "Esta semana até hoje" (título, gasto de
  // planejado, barra em cinza) — um degrau abaixo do herói, sem disputar com ele.
  if (!prominent) {
    return (
      <section aria-labelledby="home-month-title">
        <Link href="/plan" onClick={open} className="flex items-baseline justify-between gap-3">
          <SectionTitle id="home-month-title">{title}</SectionTitle>
          {settled ? (
            <span className="text-sm tabular-nums">
              <span className="font-semibold text-foreground">{formatMoneyWhole(spent)}</span>
              <span className="text-muted-foreground"> de {formatMoneyWhole(planned)}</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground tabular-nums">{formatMoneyWhole(planned)} · rascunho</span>
          )}
        </Link>
        <div className="mt-3">
          <HomeMonthBar bar={bar} showSpending={settled} idleCaption={caption} monochrome />
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="home-month-title">
      <Link href="/plan" onClick={open} className="group flex items-baseline justify-between gap-3">
        <SectionTitle id="home-month-title">{title}</SectionTitle>
        <CaretRight size={12} weight="bold" className="text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
      </Link>
      {settled ? (
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className={amountClass}>{formatMoneyWhole(spent)}</span>
          <span className="text-sm text-muted-foreground tabular-nums">gastos de {formatMoneyWhole(planned)} planejado</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground tabular-nums">{formatMoneyWhole(planned)} planejado · plano em rascunho</p>
      )}
      <div className="mt-3">
        <HomeMonthBar bar={bar} showSpending={settled} idleCaption={caption} />
      </div>
    </section>
  )
}
