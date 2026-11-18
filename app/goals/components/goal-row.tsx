"use client"
/* eslint-disable react-hooks/static-components -- o ícone vem de goalIconFor: um mapa fixo, não um componente novo a cada render. */

import { CheckCircle, Pencil, Trash } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { goalProgress } from "@/lib/goal-allocation"
import { formatMoneyWhole } from "@/lib/plan-layout"
import type { Goal } from "@/lib/types"
import { cn } from "@/lib/utils"
import { goalIconFor } from "../goal-icons"

interface GoalRowProps {
  goal: Goal
  onEdit: () => void
  onDelete: () => void
  onAllocate: () => void
}

// Um objetivo na lista: o quanto já está separado × a meta, a barra e de quais
// reservas vem o dinheiro. A barra é neutra; verde só quando a meta foi alcançada.
export function GoalRow({ goal, onEdit, onDelete, onAllocate }: GoalRowProps) {
  const pct = goalProgress(goal.currentAmount, goal.targetAmount)
  const reached = goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount
  const Icon = goalIconFor(goal.icon)
  const allocations = goal.allocations ?? []
  const deadline = goal.deadline ? new Date(goal.deadline).toLocaleDateString("pt-BR") : null

  return (
    <li className="py-5">
      <div className="flex items-center gap-3">
        <Icon size={22} weight="duotone" className="shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{goal.name}</p>
          {deadline && <p className="text-xs text-muted-foreground">Até {deadline}</p>}
        </div>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Editar ${goal.name}`}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <Pencil size={16} weight="bold" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Excluir ${goal.name}`}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-expense/10 hover:text-expense"
        >
          <Trash size={16} weight="bold" />
        </button>
      </div>

      <p className="mt-2 flex items-baseline justify-between gap-3 tabular-nums">
        <span>
          <span className="text-xl font-semibold tracking-tight text-foreground">{formatCurrency(goal.currentAmount)}</span>
          <span className="text-sm text-muted-foreground"> de {formatMoneyWhole(goal.targetAmount)}</span>
        </span>
        {reached ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-positive-ink">
            <CheckCircle size={14} weight="fill" aria-hidden />
            Meta alcançada
          </span>
        ) : (
          <span className="text-sm text-muted-foreground">{Math.floor(pct)}%</span>
        )}
      </p>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full"
        style={{ backgroundColor: "var(--plan-track)" }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, Math.round(pct))}
        aria-label={`${goal.name}: ${Math.floor(pct)}% da meta`}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", reached ? "bg-income" : "bg-foreground/60")}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {allocations.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground tabular-nums">
          {allocations.map((a) => (
            <li key={a.savingsGoalId} className="flex justify-between gap-3">
              <span className="truncate">De {a.name}</span>
              <span className="shrink-0">{formatCurrency(a.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onAllocate}
        className="mt-3 text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
      >
        {allocations.length > 0 ? "Mudar a separação" : "Separar de uma reserva"}
      </button>
    </li>
  )
}
