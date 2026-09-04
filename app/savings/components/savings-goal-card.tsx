"use client"

import Link from "next/link"
import { Receipt, Trash, Pencil, Heart } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { getSavingsIcon } from "@/lib/savings-icons"

interface SavingsGoalCardProps {
  goal: any
  onDelete: (id: string) => void
  onEdit: (goal: any) => void
}

export function SavingsGoalCard({ goal, onDelete, onEdit }: SavingsGoalCardProps) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100
  const Icon = getSavingsIcon(goal.icon)

  return (
    <div className="rounded-2xl bg-card p-6 border border-border/50 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 flex items-center justify-center shrink-0 text-muted-foreground">
            <Icon size={26} weight="duotone" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">{goal.name}</h3>
              {goal.isCasal && (
                <span className="text-[10px] flex items-center gap-1 font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                  <Heart size={10} weight="fill" />Casal
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Meta: {formatCurrency(goal.targetAmount)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(goal)}
            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil size={18} weight="bold" />
          </button>
          <button
            onClick={() => onDelete(goal.id)}
            className="p-2 rounded-lg text-muted-foreground hover:text-expense hover:bg-expense/10 transition-colors"
          >
            <Trash size={18} weight="bold" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-foreground">{formatCurrency(goal.currentAmount)}</span>
          <span className="text-sm font-medium text-muted-foreground">{progress.toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Adicionar/retirar fundos agora passa pelo fluxo normal de Nova Transação
          (categoria Investimento), que atualiza o saldo desta reserva automaticamente. */}
      <Link
        href={`/new?goalId=${goal.id}`}
        className="flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
      >
        <Receipt size={18} weight="bold" />
        Cadastrar Transação
      </Link>
    </div>
  )
}
