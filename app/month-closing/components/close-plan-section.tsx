"use client"

import Link from "next/link"
import { ArrowClockwise, CaretRight, CheckCircle, LockSimple, Target, Tray, Warning } from "@phosphor-icons/react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/date-utils"
import { adherenceTone, DECISION_LABEL, postponeWarning, type WishDecision } from "@/lib/closing"
import { cn } from "@/lib/utils"
import { useClosePlanViewModel } from "../hooks/use-close-plan-view-model"

const DECISIONS: WishDecision[] = ["NEXT_MONTH", "GOAL", "REMOVE"]

const inputClass =
  "w-full px-3 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <span className="w-5 h-5 rounded-full bg-primary text-background text-[11px] font-bold flex items-center justify-center">{n}</span>
      {children}
    </h3>
  )
}

// Fechar o plano do mês: pendências da caixa, planejado × real, decisão de
// cada desejo em aberto e destino da sobra.
export function ClosePlanSection() {
  const vm = useClosePlanViewModel()

  if (vm.isReadOnly) {
    return (
      <div className="rounded-[20px] bg-card p-8 text-center border border-border/50">
        <p className="text-sm text-muted-foreground">O fechamento do plano de um parceiro não pode ser feito por aqui.</p>
      </div>
    )
  }

  const monthSwitch = (
    <div className="grid grid-cols-2 bg-muted rounded-full p-1 text-xs font-semibold">
      {vm.monthOptions.map((m, i) => (
        <button
          key={m}
          type="button"
          onClick={() => vm.setTargetMonth(m)}
          className={cn("py-1.5 rounded-full transition-colors", vm.targetMonth === m ? "bg-card shadow-sm" : "text-muted-foreground")}
        >
          {i === 0 ? "Mês passado" : "Mês atual"}
        </button>
      ))}
    </div>
  )

  if (vm.isLoading) {
    return (
      <div className="space-y-3">
        {monthSwitch}
        <Skeleton className="h-32 rounded-[20px]" />
        <Skeleton className="h-40 rounded-[20px]" />
      </div>
    )
  }

  if (vm.loadError) {
    return (
      <div className="space-y-3">
        {monthSwitch}
        <div className="rounded-[20px] bg-card p-8 text-center border border-border/50 space-y-3">
          <p className="text-sm text-muted-foreground">Não foi possível carregar o fechamento agora.</p>
          <button type="button" onClick={vm.reload} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            <ArrowClockwise size={14} weight="bold" />
            Tentar de novo
          </button>
        </div>
      </div>
    )
  }

  if (vm.status === "NONE") {
    return (
      <div className="space-y-3">
        {monthSwitch}
        <div className="rounded-[20px] bg-card p-8 text-center border border-border/50 space-y-3">
          <Target size={36} weight="duotone" className="mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Não há plano salvo para {vm.monthLabel}. Planeje o mês para poder fechá-lo.</p>
          <Link href="/plan" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-background text-sm font-semibold">
            Planejar o mês
          </Link>
        </div>
      </div>
    )
  }

  const summary = vm.data?.summary
  const closed = vm.status === "CLOSED"
  const tone = summary ? adherenceTone(summary.adherencePct) : "ok"
  const wishes = vm.data?.openWishes ?? []
  const hasLeftover = !!summary && summary.leftover > 0
  const destinationOptions = vm.destination === "GOAL" ? vm.goals : vm.destination === "SAVINGS" ? vm.savings : []

  return (
    <div className="space-y-4">
      {monthSwitch}

      {closed && (
        <div className="flex items-center gap-2 rounded-2xl bg-card border border-border/50 p-3 text-sm">
          <LockSimple size={16} weight="bold" className="text-muted-foreground" />
          <span>O plano de {vm.monthLabel} já está fechado.</span>
        </div>
      )}

      {/* 1. Pendências da caixa */}
      {!closed && (
        <section className="rounded-[20px] bg-card border border-border/50 p-4 space-y-2">
          <StepTitle n={1}>Classifique as pendências</StepTitle>
          {vm.inboxCount > 0 ? (
            <Link
              href="/inbox"
              className="flex items-center gap-3 p-3 rounded-xl bg-background hover:bg-muted transition-colors"
            >
              <Tray size={20} weight="duotone" className="text-muted-foreground shrink-0" />
              <span className="flex-1 text-sm">
                {vm.inboxCount === 1 ? "1 transação sem categoria" : `${vm.inboxCount} transações sem categoria`}
                <span className="block text-xs text-muted-foreground">Classifique antes para o resumo ficar certo.</span>
              </span>
              <CaretRight size={14} weight="bold" className="text-muted-foreground" />
            </Link>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle size={16} weight="fill" className="text-income" />
              Nada esperando categoria.
            </p>
          )}
        </section>
      )}

      {/* 2. Planejado × real */}
      {summary && (
        <section className="rounded-[20px] bg-card border border-border/50 p-4 space-y-3">
          <StepTitle n={closed ? 1 : 2}>Planejado × real de {vm.monthLabel}</StepTitle>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-background p-3">
              <dt className="text-xs text-muted-foreground">Orçamento</dt>
              <dd className="font-bold tabular-nums">{formatCurrency(summary.budgetAmount)}</dd>
            </div>
            <div className="rounded-xl bg-background p-3">
              <dt className="text-xs text-muted-foreground">Planejado</dt>
              <dd className="font-bold tabular-nums">{formatCurrency(summary.plannedTotal)}</dd>
            </div>
            <div className="rounded-xl bg-background p-3">
              <dt className="text-xs text-muted-foreground">Gasto</dt>
              <dd className={cn("font-bold tabular-nums", tone === "over" && "text-expense")}>{formatCurrency(summary.spentTotal)}</dd>
            </div>
            <div className="rounded-xl bg-background p-3">
              <dt className="text-xs text-muted-foreground">Sobra</dt>
              <dd className={cn("font-bold tabular-nums", summary.leftover < 0 ? "text-expense" : "text-income")}>
                {formatCurrency(summary.leftover)}
              </dd>
            </div>
          </dl>
          <p
            className={cn(
              "text-xs",
              tone === "ok" ? "text-muted-foreground" : tone === "warning" ? "text-amber-700 dark:text-amber-400" : "text-expense",
            )}
          >
            Você gastou {Math.round(summary.adherencePct)}% do planejado.
          </p>
        </section>
      )}

      {!closed && (
        <>
          {/* 3. Desejos em aberto */}
          <section className="rounded-[20px] bg-card border border-border/50 p-4 space-y-3">
            <StepTitle n={3}>Desejos que ficaram em aberto</StepTitle>
            {wishes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum desejo pendente.</p>
            ) : (
              <ul className="space-y-3">
                {wishes.map((wish) => {
                  const decision = vm.decisions[wish.id] ?? "NEXT_MONTH"
                  const warning = decision === "NEXT_MONTH" ? postponeWarning(wish) : null
                  return (
                    <li key={wish.id} className="rounded-xl bg-background p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">{wish.name}</p>
                        <p className="text-sm font-bold tabular-nums shrink-0">{formatCurrency(wish.estimatedAmount)}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label={`Decisão para ${wish.name}`}>
                        {DECISIONS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            role="radio"
                            aria-checked={decision === d}
                            onClick={() => vm.setDecision(wish.id, d)}
                            className={cn(
                              "py-1.5 rounded-lg text-xs font-semibold border transition-colors",
                              decision === d
                                ? d === "REMOVE"
                                  ? "border-expense bg-expense/10 text-expense"
                                  : "border-primary bg-primary/10 text-foreground"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {DECISION_LABEL[d]}
                          </button>
                        ))}
                      </div>
                      {warning && (
                        <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                          <Warning size={14} weight="fill" className="shrink-0 mt-0.5" />
                          {warning}
                        </p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* 4. Sobra */}
          <section className="rounded-[20px] bg-card border border-border/50 p-4 space-y-3">
            <StepTitle n={4}>Para onde vai a sobra?</StepTitle>
            {!hasLeftover ? (
              <p className="text-sm text-muted-foreground">Sem sobra neste mês.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1 text-xs font-semibold" role="radiogroup" aria-label="Destino da sobra">
                  {([
                    ["GOAL", "Objetivo"],
                    ["SAVINGS", "Reserva"],
                    [null, "Deixar na conta"],
                  ] as const).map(([value, label]) => (
                    <button
                      key={label}
                      type="button"
                      role="radio"
                      aria-checked={vm.destination === value}
                      onClick={() => vm.setDestination(value)}
                      className={cn(
                        "py-2 rounded-lg border transition-colors",
                        vm.destination === value ? "border-primary bg-primary/10" : "border-border text-muted-foreground",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {vm.destination && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      aria-label={vm.destination === "GOAL" ? "Objetivo" : "Reserva"}
                      value={vm.destinationId}
                      onChange={(e) => vm.setDestinationId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">{vm.destination === "GOAL" ? "Escolha o objetivo" : "Escolha a reserva"}</option>
                      {destinationOptions.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
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
              </>
            )}
          </section>

          {vm.formError && <p className="text-sm text-expense px-1">{vm.formError}</p>}

          <button
            type="button"
            onClick={vm.close}
            disabled={vm.isClosing}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-primary text-background font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <LockSimple size={18} weight="bold" />
            {vm.isClosing ? "Fechando..." : `Fechar ${vm.monthLabel}`}
          </button>
        </>
      )}
    </div>
  )
}
