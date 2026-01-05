"use client"

import { useState, useEffect } from "react"
import { Plus } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { SavingsGoalCard } from "@/components/savings/savings-goal-card"
import { AddSavingsGoalDialog } from "@/components/savings/add-savings-goal-dialog"
import { EditSavingsDialog } from "@/components/savings/edit-savings-dialog"
import {
  getSavingsGoals,
  addSavingsGoal,
  deleteSavingsGoal,
  addFundsToSavingsGoal,
  removeFundsFromSavingsGoal,
  updateSavingsGoal,
} from "@/lib/storage"
import { formatCurrency } from "@/lib/date-utils"

export default function SavingsPage() {
  const [goals, setGoals] = useState<any[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<any>(null)

  useEffect(() => {
    setGoals(getSavingsGoals())
  }, [])

  const handleAddGoal = (goalData: any) => {
    const newGoal = addSavingsGoal(goalData)
    setGoals([...goals, newGoal])
  }

  const handleEdit = (goal: any) => {
    setEditingGoal(goal)
    setIsEditDialogOpen(true)
  }

  const handleSaveEdit = (id: string, updates: any) => {
    updateSavingsGoal(id, updates)
    setGoals(getSavingsGoals())
    setIsEditDialogOpen(false)
    setEditingGoal(null)
  }

  const handleAddFunds = (id: string, amount: number, cardId?: string) => {
    addFundsToSavingsGoal(id, amount, cardId)
    setGoals(getSavingsGoals())
  }

  const handleRemoveFunds = (id: string, amount: number, cardId?: string) => {
    removeFundsFromSavingsGoal(id, amount, cardId)
    setGoals(getSavingsGoals())
  }

  const handleDelete = (id: string) => {
    const goal = goals.find((g) => g.id === id)
    if (goal && goal.currentAmount > 0) {
      if (!confirm("Esta reserva possui fundos. Ao excluir, o valor será perdido. Deseja continuar?")) {
        return
      }
    }
    deleteSavingsGoal(id)
    setGoals(goals.filter((g) => g.id !== id))
  }

  const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0)
  const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0)

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-6">
        <PageHeader title="Reservas" subtitle="Organize seu dinheiro por objetivos" />
        <button
          onClick={() => setIsDialogOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} weight="bold" />
          Nova Reserva
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="rounded-2xl bg-card p-6 border border-border/50 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Total Guardado</p>
          <p className="text-3xl font-bold text-income">{formatCurrency(totalSaved)}</p>
        </div>
        <div className="rounded-2xl bg-card p-6 border border-border/50 shadow-sm">
          <p className="text-sm text-muted-foreground mb-1">Meta Total</p>
          <p className="text-3xl font-bold text-foreground">{formatCurrency(totalTarget)}</p>
        </div>
      </div>

      {/* Goals List */}
      {goals.length === 0 ? (
        <div className="rounded-2xl bg-card p-12 border border-border/50 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
            <Plus size={32} className="text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma reserva criada</h3>
          <p className="text-sm text-muted-foreground mb-6">Crie reservas para organizar seu dinheiro por objetivos</p>
          <button
            onClick={() => setIsDialogOpen(true)}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors"
          >
            Criar Primeira Reserva
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => (
            <SavingsGoalCard
              key={goal.id}
              goal={goal}
              onAddFunds={handleAddFunds}
              onRemoveFunds={handleRemoveFunds}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <AddSavingsGoalDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onAdd={handleAddGoal} />

      {isEditDialogOpen && editingGoal && (
        <EditSavingsDialog goal={editingGoal} onSave={handleSaveEdit} onClose={() => setIsEditDialogOpen(false)} />
      )}
    </AppLayout>
  )
}
