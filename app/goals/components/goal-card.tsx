"use client"

import { Pencil, Trash, Plus } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import type { Goal } from "@/lib/types"
import { cn } from "@/lib/utils"
import * as PhosphorIcons from "@phosphor-icons/react"

interface GoalCardProps {
  goal: Goal
  onEdit?: () => void
  onDelete?: () => void
  onAddFunds?: () => void
}

export function GoalCard({ goal, onEdit, onDelete, onAddFunds }: GoalCardProps) {
  const progress = (goal.currentAmount / goal.targetAmount) * 100
  const isCompleted = progress >= 100

  const IconComponent = (goal.icon && PhosphorIcons[goal.icon as keyof typeof PhosphorIcons]) || PhosphorIcons.Target

  const daysRemaining = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="rounded-[20px] bg-card p-6 border border-border/50 shadow-sm hover:shadow-md transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-[1vw] flex items-center justify-center"
            style={{ backgroundColor: goal.color + "20", color: goal.color }}
          >
            {/* @ts-ignore */}
            <IconComponent size={24} weight="bold" />
          </div>

          <div>
            <h3 className="font-bold text-foreground">{goal.name}</h3>
            {goal.deadline && !isCompleted && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {daysRemaining && daysRemaining > 0
                  ? `${daysRemaining} dias restantes`
                  : daysRemaining === 0
                    ? "Vence hoje"
                    : "Vencido"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Editar"
          >
            <Pencil weight="bold" size={16} />
          </button>

          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
            title="Excluir"
          >
            <Trash weight="bold" size={16} />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(goal.currentAmount)}</p>
            <p className="text-xs text-muted-foreground">de {formatCurrency(goal.targetAmount)}</p>
          </div>

          <div className="text-right">
            <p className={cn("text-lg font-bold", isCompleted ? "text-income" : "text-primary")}>
              {Math.min(progress, 100).toFixed(0)}%
            </p>
          </div>
        </div>

        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", isCompleted ? "bg-income" : "bg-primary")}
            style={{
              width: `${Math.min(progress, 100)}%`,
              backgroundColor: !isCompleted ? goal.color : undefined,
            }}
          />
        </div>
      </div>

      {/* Action Button */}
      {!isCompleted && (
        <button
          onClick={onAddFunds}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[1vw] bg-primary/10 text-primary hover:bg-primary/20 font-semibold text-sm transition-colors"
        >
          <Plus weight="bold" size={16} />
          Adicionar Valor
        </button>
      )}

      {isCompleted && (
        <div className="text-center py-2 px-4 rounded-[1vw] bg-income/10 text-income font-semibold text-sm">
          Meta Atingida!
        </div>
      )}
    </div>
  )
}
