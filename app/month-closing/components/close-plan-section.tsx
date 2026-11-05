"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowClockwise, CaretRight, CheckCircle, Hourglass, LockSimple, Target, Warning } from "@phosphor-icons/react"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle, ColorDot } from "@/app/plan/components/plan-ui"
import { formatCurrency } from "@/lib/date-utils"
import { closingResult, DECISION_LABEL, formatMoneyNoCents, groupOutcomes, postponeWarning, type WishDecision } from "@/lib/closing"
import { cn } from "@/lib/utils"
import { useClosePlanViewModel } from "../hooks/use-close-plan-view-model"
import { AppSelect } from "@/components/ui/app-select"
import { useAccount } from "@/components/account/account-context"
import { CoupleSettlementLine, useCoupleSettled } from "@/components/couple/couple-split-section"

const DECISIONS: WishDecision[] = ["NEXT_MONTH", "GOAL", "REMOVE"]

const inputClass =
  "w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"

// Um passo do "Para fechar": ✓ quando resolvido, número quando falta algo.
function Step({ n, done, title, children }: { n: number; done: boolean; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 py-4">
      {done ? (
        <CheckCircle size={22} weight="fill" className="shrink-0 text-positive-ink" aria-label="Resolvido" />
      ) : (
        <span
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-foreground/40 text-[11px] font-bold text-foreground"
          aria-label="Falta resolver"
        >
          {n}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="mt-1.5">{children}</div>
      </div>
    </li>
  )
}

// Fechar o plano do mês, como um ritual curto: (1) como foi o mês, (2) o que
// falta para fechar — pendências, desejos em aberto, destino da sobra — e o
// botão; depois de fechado, o convite para planejar o mês seguinte. O que vence
// no próximo mês fica logo abaixo (MonthClosingView).
export function ClosePlanSection() {
  const vm = useClosePlanViewModel()
  // Conta do casal: não recebe renda, então não tem sobra para destinar — o passo vira o acerto entre os dois.
  const isCouple = useAccount().selection.type === "couple"
  const coupleSettled = useCoupleSettled(vm.targetMonth ?? "", isCouple && !!vm.targetMonth)

  if (vm.isReadOnly) {
    return <p className="py-12 text-center text-sm text-muted-foreground">O fechamento do plano de um parceiro não pode ser feito por aqui.</p>
  }

  // O mês sendo fechado e o atalho para o outro mês que dá para fechar.
  const monthLine = (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-2xl font-bold text-foreground first-letter:uppercase">{vm.monthLabel}</h2>
      <button type="button" onClick={() => vm.setTargetMonth(vm.otherMonth)} className="text-sm font-medium text-primary hover:underline shrink-0">
        Ver {vm.otherMonthName}
      </button>
    </div>
  )

  if (vm.isLoading) {
    return (
      <div className="space-y-8" aria-busy>
        {monthLine}
        <div className="space-y-3">
          <Skeleton className="h-4 w-40 rounded-full" />
          <Skeleton className="h-12 w-56 rounded-xl" />
          <Skeleton className="h-4 w-64 rounded-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  if (vm.loadError) {
    return (
      <div className="space-y-8">
        {monthLine}
        <div className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Não foi possível carregar o fechamento agora.</p>
          <button type="button" onClick={vm.reload} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowClockwise size={14} weight="bold" />
            Tentar de novo
          </button>
        </div>
      </div>
    )
  }

  const summary = vm.data?.summary
  const closed = vm.status === "CLOSED"
  // Sem plano salvo dá para fechar mesmo assim (o backend salva a proposta e
  // fecha); o resultado fala só do realizado.
  const noPlan = vm.status === "NONE"
  const inProgress = vm.timing.inProgress && !closed
  const wishes = vm.data?.openWishes ?? []
  const showWishes = !noPlan || wishes.length > 0
  const hasLeftover = !!summary && summary.leftover > 0
  const destinationOptions = vm.destination === "GOAL" ? vm.goals : vm.destination === "SAVINGS" ? vm.savings : []
  const result = summary ? closingResult(summary, vm.monthName, { inProgress, hasPlan: !noPlan }) : null
  const outcomes = noPlan ? [] : groupOutcomes(vm.groups, inProgress)

  return (
    <div className="space-y-12">
      <div className="space-y-3">
        {monthLine}
        {inProgress && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Hourglass size={16} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
            <span>O mês fecha em {vm.timing.endLabel}. Dá para fechar antes, mas os gastos de hoje em diante ficam de fora.</span>
          </p>
        )}
        {closed && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LockSimple size={16} weight="bold" aria-hidden />
            Mês fechado.
          </p>
        )}
      </div>

      {/* 1. Como foi o mês */}
      {result && summary && (
        <section aria-labelledby="closing-result-label">
          <p id="closing-result-label" className="text-sm text-muted-foreground">
            {result.label}
          </p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
            <span
              className={cn(
                "text-5xl font-semibold tracking-tight leading-none tabular-nums",
                result.tone === "over" ? "text-expense" : "text-foreground",
              )}
            >
              {formatMoneyNoCents(result.value)}
            </span>
            <span className={cn("text-base", result.tone === "over" ? "text-expense" : "text-muted-foreground")}>{result.suffix}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground tabular-nums">{result.line}</p>
          {inProgress && !noPlan && vm.forecastLeftover !== null && (
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              No plano, a sobra prevista é <span className="font-semibold text-foreground">{formatCurrency(vm.forecastLeftover)}</span>.
            </p>
          )}
          {noPlan && (
            <p className="mt-2 text-xs text-muted-foreground">
              Este mês não teve plano salvo, então não há comparativo.{" "}
              <Link href="/plan" className="text-primary hover:underline">
                Planejar o próximo
              </Link>
            </p>
          )}

          {outcomes.length > 0 && (
            <ul className="mt-6 divide-y divide-border border-y border-border" aria-label="Como terminou cada grupo">
              {outcomes.map((g) => (
                <li key={g.id} className="flex items-center gap-3 py-3">
                  <ColorDot color={g.color} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate text-sm text-foreground">{g.name}</span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {formatMoneyNoCents(g.spent)} de {formatMoneyNoCents(g.planned)}
                    </span>
                  </span>
                  <span className={cn("shrink-0 text-right text-sm font-medium tabular-nums", g.over ? "text-expense" : "text-positive-ink")}>
                    {g.text}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* 2. Para fechar: pendências, desejos e sobra, depois o botão */}
      {!closed && (
        <section aria-labelledby="closing-steps-title">
          <SectionTitle id="closing-steps-title">Para fechar</SectionTitle>
          <ol className="mt-2 divide-y divide-border">
            <Step n={1} done={vm.inboxCount === 0} title="Classifique as pendências">
              {vm.inboxCount > 0 ? (
                <Link href="/inbox" className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <span className="flex-1">
                    <span className="font-medium text-foreground">
                      {vm.inboxCount === 1 ? "1 transação sem categoria" : `${vm.inboxCount} transações sem categoria`}
                    </span>{" "}
                    — classifique antes para o resultado ficar certo.
                  </span>
                  <CaretRight size={12} weight="bold" className="shrink-0" />
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">Nada esperando categoria.</p>
              )}
            </Step>

            {/* Sem plano, só aparece se houver desejo aberto (o backend exige uma decisão para cada um). */}
            {showWishes && (
              <Step n={2} done title="Decida os desejos que ficaram em aberto">
                {wishes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum desejo pendente.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {wishes.map((wish) => {
                      const decision = vm.decisions[wish.id] ?? "NEXT_MONTH"
                      const warning = decision === "NEXT_MONTH" ? postponeWarning(wish) : null
                      return (
                        <li key={wish.id} className="py-2.5 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="flex-1 min-w-0">
                              <span className="block text-sm font-medium text-foreground truncate">{wish.name}</span>
                              <span className="block text-xs text-muted-foreground tabular-nums">{formatCurrency(wish.estimatedAmount)}</span>
                            </span>
                            <AppSelect
                              variant="pill"
                              aria-label={`Decisão para ${wish.name}`}
                              value={decision}
                              onChange={(v) => vm.setDecision(wish.id, v as WishDecision)}
                              options={DECISIONS.map((d) => ({ value: d, label: DECISION_LABEL[d] }))}
                              className={cn("h-8 shrink-0 text-xs font-semibold", decision === "REMOVE" && "border-expense text-expense")}
                            />
                          </div>
                          {warning && (
                            <p className="flex items-start gap-1.5 text-xs text-attention-ink">
                              <Warning size={14} weight="fill" className="shrink-0 mt-0.5" />
                              {warning}
                            </p>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Step>
            )}

            {isCouple ? (
              <Step n={showWishes ? 3 : 2} done={coupleSettled} title="Acertem as contas do casal">
                {vm.targetMonth && <CoupleSettlementLine monthKey={vm.targetMonth} />}
              </Step>
            ) : (
            <Step n={showWishes ? 3 : 2} done={!hasLeftover || !vm.destination || !!vm.destinationId} title="Para onde vai a sobra?">
              {!hasLeftover ? (
                <p className="text-sm text-muted-foreground">Sem sobra neste mês.</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted/40 p-1 text-xs font-semibold" role="radiogroup" aria-label="Destino da sobra">
                    {([
                      [null, "Deixar na conta"],
                      ["SAVINGS", "Reserva"],
                      ["GOAL", "Objetivo"],
                    ] as const).map(([value, label]) => (
                      <button
                        key={label}
                        type="button"
                        role="radio"
                        aria-checked={vm.destination === value}
                        onClick={() => vm.setDestination(value)}
                        className={cn(
                          "py-2 rounded-lg transition-colors",
                          vm.destination === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {vm.destination && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <AppSelect
                        aria-label={vm.destination === "GOAL" ? "Objetivo" : "Reserva"}
                        value={vm.destinationId}
                        onChange={vm.setDestinationId}
                        placeholder={vm.destination === "GOAL" ? "Escolha o objetivo" : "Escolha a reserva"}
                        options={destinationOptions.map((o) => ({ value: o.id, label: o.name }))}
                      />
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-semibold">R$</span>
                        <input
                          inputMode="decimal"
                          aria-label="Valor da sobra a guardar"
                          value={vm.leftoverAmount}
                          onChange={(e) => vm.setLeftoverAmount(e.target.value)}
                          className={cn(inputClass, "pl-9 tabular-nums")}
                        />
                      </div>
                      {destinationOptions.length === 0 && (
                        <p className="sm:col-span-2 text-xs text-muted-foreground">
                          Nenhum{vm.destination === "GOAL" ? " objetivo" : "a reserva"} cadastrad{vm.destination === "GOAL" ? "o" : "a"} ainda —{" "}
                          <Link href={vm.destination === "GOAL" ? "/goals" : "/savings"} className="text-primary hover:underline">
                            criar
                          </Link>
                          .
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </Step>
            )}
          </ol>

          {vm.formError && <p className="mt-2 text-sm text-expense">{vm.formError}</p>}

          {/* Mês em andamento: fechar continua possível, mas não é a ação principal. */}
          <button
            type="button"
            onClick={vm.close}
            disabled={vm.isClosing}
            className={cn(
              "mt-4 w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold transition-colors disabled:opacity-50",
              inProgress ? "border border-border text-foreground hover:bg-foreground/5" : "bg-primary text-background hover:bg-primary/90",
            )}
          >
            <LockSimple size={18} weight="bold" />
            {vm.isClosing ? "Fechando..." : inProgress ? "Fechar antes do fim" : `Fechar ${vm.monthName}`}
          </button>
        </section>
      )}

      {/* Depois de fechado: o próximo passo é o plano do mês seguinte —
          montar, terminar o rascunho ou só conferir o que já está confirmado. */}
      {closed && (() => {
        const next = vm.followingPlanStatus
        const title =
          next === "CONFIRMED" || next === "CLOSED"
            ? `Ver o plano de ${vm.followingMonthName}`
            : next === "DRAFT"
              ? `Terminar o plano de ${vm.followingMonthName}`
              : `Planejar ${vm.followingMonthName}`
        const detail =
          next === "CONFIRMED" || next === "CLOSED"
            ? "Já está confirmado. Confira como ele está indo."
            : "Os desejos adiados já estão esperando no próximo plano."
        return (
          <Link href="/plan" className="flex items-center gap-3 rounded-2xl border border-border px-4 py-4 hover:border-primary/40 transition-colors">
            <Target size={22} weight="duotone" className="shrink-0 text-foreground/70" />
            <span className="flex-1 min-w-0">
              <span className="block font-semibold text-foreground">{title}</span>
              <span className="block text-sm text-muted-foreground">{detail}</span>
            </span>
            <CaretRight size={14} weight="bold" className="shrink-0 text-muted-foreground" />
          </Link>
        )
      })()}
    </div>
  )
}
