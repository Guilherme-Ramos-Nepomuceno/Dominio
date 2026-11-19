"use client"

import { Plus } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { PageSwitch } from "@/components/ui/page-switch"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { formatCurrency } from "@/lib/date-utils"
import { goalProgress } from "@/lib/goal-allocation"
import { formatMoneyWhole } from "@/lib/plan-layout"
import type { Goal } from "@/lib/types"
import { useGoalsViewModel } from "../hooks/use-goals-view-model"
import { AllocateFundsSheet } from "./allocate-funds-sheet"
import { GoalFormSheet } from "./goal-form-sheet"
import { GoalRow } from "./goal-row"

const SAVED_MONEY_TABS = [
  { href: "/savings", label: "Reservas" },
  { href: "/goals", label: "Objetivos" },
]

// Página corrida (ADR-013): o total separado para objetivos em destaque, e a
// lista dos objetivos com as reservas de onde vem o dinheiro.
export function GoalsView() {
  const vm = useGoalsViewModel()

  const pct = goalProgress(vm.totalSaved, vm.totalTarget)
  const allocatingGoal: Goal | undefined = vm.allocatingGoal

  return (
    <AppLayout primaryAction={{ label: "Novo objetivo", onPress: vm.openNew }}>
      <PageHeader back="/all-menus" title="Objetivos" subtitle="Quanto você já separou para cada coisa" className="mb-4 md:mb-4" />
      <PageSwitch label="Guardado" current="/goals" items={SAVED_MONEY_TABS} className="mb-8" />

      {vm.loading ? (
        <div className="mx-auto max-w-2xl space-y-10" aria-busy>
          <div className="space-y-3">
            <Skeleton className="h-4 w-32 rounded-full" />
            <Skeleton className="h-12 w-56 rounded-xl" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : vm.goals.length === 0 ? (
        <FirstGoal onCreate={vm.openNew} freeInReserves={vm.totalFree} hasReserves={vm.reserves.length > 0} />
      ) : (
        <div className="mx-auto max-w-2xl space-y-10">
          <section aria-labelledby="goals-total-label">
            <p id="goals-total-label" className="text-sm text-muted-foreground">
              Separado para objetivos
            </p>
            <p className="mt-1 font-display text-5xl font-semibold leading-none tracking-tight tabular-nums text-foreground">
              {formatCurrency(vm.totalSaved)}
            </p>
            <p className="mt-3 text-sm tabular-nums text-muted-foreground">
              <span className="font-semibold text-foreground">{Math.floor(pct)}%</span> das metas · {formatMoneyWhole(vm.totalTarget)} no total
            </p>
            {vm.goals.length > 1 && (
              <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--plan-track)" }} aria-hidden>
                <div className="h-full rounded-full bg-foreground/60 transition-[width] duration-500" style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
            )}
            <p className="mt-3 text-sm text-muted-foreground tabular-nums">{formatCurrency(vm.totalFree)} ainda livres nas suas reservas</p>
          </section>

          <section aria-labelledby="goals-list-title">
            <SectionTitle id="goals-list-title">{vm.goals.length === 1 ? "Seu objetivo" : `Seus ${vm.goals.length} objetivos`}</SectionTitle>
            <ul className="mt-1 divide-y divide-border">
              {vm.goals.map((goal) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  onEdit={() => vm.openEdit(goal)}
                  onDelete={() => vm.handleDeleteGoal(goal)}
                  onAllocate={() => vm.setAllocatingGoal(goal)}
                />
              ))}
            </ul>
          </section>
        </div>
      )}

      {vm.isFormOpen && <GoalFormSheet initialGoal={vm.editingGoal} reserves={vm.reserves} onClose={vm.closeForm} onSave={vm.handleSaveGoal} />}

      {allocatingGoal && (
        <AllocateFundsSheet
          goal={allocatingGoal}
          reserves={vm.reserves}
          onClose={() => vm.setAllocatingGoal(undefined)}
          onAllocate={(savingsGoalId, amount) => vm.handleAllocate(allocatingGoal.id, savingsGoalId, amount)}
          onRemove={(savingsGoalId) => vm.handleRemoveAllocation(allocatingGoal.id, savingsGoalId)}
        />
      )}
    </AppLayout>
  )
}

// Primeiro acesso, sem objetivo: explica o fluxo em dois passos (objetivo, origem do
// dinheiro) e leva para criar o primeiro. Sem cartão nem ícone solto no centro.
function FirstGoal({ onCreate, freeInReserves, hasReserves }: { onCreate: () => void; freeInReserves: number; hasReserves: boolean }) {
  const steps = [
    {
      title: "Crie o objetivo",
      text: "Diga o que quer pagar, quanto custa e, se quiser, até quando.",
    },
    {
      title: "Escolha de onde vem o dinheiro",
      text: "Do que você já guarda nas reservas. Escolha quanto de cada uma vai para ele; o resto continua livre.",
    },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <section aria-labelledby="first-goal-title" className="space-y-4">
        <h2 id="first-goal-title" className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground">
          Dê nome ao que você quer pagar.
        </h2>
        <p className="max-w-md text-base leading-relaxed text-muted-foreground">
          Uma viagem, um carro, uma reforma. Cada objetivo mostra quanto do seu dinheiro guardado já está separado para ele.
        </p>
        {hasReserves && freeInReserves > 0 && (
          <p className="text-sm tabular-nums text-muted-foreground">
            Você já tem <span className="font-semibold text-foreground">{formatCurrency(freeInReserves)}</span> livres nas suas reservas.
          </p>
        )}
        <div className="pt-2">
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-background transition-colors hover:bg-foreground/90"
          >
            <Plus size={16} weight="bold" aria-hidden />
            Criar o primeiro objetivo
          </button>
        </div>
      </section>

      <section aria-labelledby="first-goal-steps">
        <SectionTitle id="first-goal-steps">Como funciona</SectionTitle>
        <ol className="mt-1 divide-y divide-border">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4 py-4">
              <span className="w-6 shrink-0 pt-0.5 font-display text-lg font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{step.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
