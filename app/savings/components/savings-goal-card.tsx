"use client"

import Link from "next/link"
import { ArrowsDownUp, CheckCircle, Heart, Pencil, Trash } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { formatMoneyWhole } from "@/lib/plan-layout"
import { getSavingsIcon } from "@/lib/savings-icons"
import { cn } from "@/lib/utils"

interface SavingsGoalCardProps {
  goal: any
  onDelete: (id: string) => void
  onEdit: (goal: any) => void
}

// Uma reserva na lista: nome, quanto já tem × a meta e a barra. A barra é
// neutra (a cor não compete com o total lá em cima); verde só quando a meta
// foi alcançada.
export function SavingsGoalCard({ goal, onDelete, onEdit }: SavingsGoalCardProps) {
  const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0
  const reached = goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount
  const Icon = getSavingsIcon(goal.icon)

  return (
    <li className="py-4">
      <div className="flex items-center gap-3">
        <Icon size={22} weight="duotone" className="shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2">
            <span className="truncate font-semibold text-foreground">{goal.name}</span>
            {goal.isCasal && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                <Heart size={10} weight="fill" aria-hidden />
                Casal
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onEdit(goal)}
          aria-label={`Editar ${goal.name}`}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <Pencil size={16} weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => onDelete(goal.id)}
          aria-label={`Excluir ${goal.name}`}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-expense/10 hover:text-expense transition-colors"
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

      {/* Guardar/retirar passa pelo fluxo normal de Nova Transação (categoria
          Investimento), que atualiza o saldo desta reserva automaticamente. */}
      <Link
        href={`/new?goalId=${goal.id}`}
        className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground"
      >
        <ArrowsDownUp size={14} weight="bold" aria-hidden />
        Guardar ou retirar
      </Link>
    </li>
  )
}
