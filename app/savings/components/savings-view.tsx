"use client"

import { Plus } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { SavingsGoalCard } from "./savings-goal-card"
import { AddSavingsGoalDialog } from "./add-savings-goal-dialog"
import { EditSavingsDialog } from "./edit-savings-dialog"
import { formatCurrency } from "@/lib/date-utils"
import { useSavingsViewModel } from "../hooks/use-savings-view-model"

export function SavingsView() {
    const {
        goals,
        isDialogOpen,
        setIsDialogOpen,
        isEditDialogOpen,
        setIsEditDialogOpen,
        editingGoal,
        handleAddGoal,
        handleEdit,
        handleSaveEdit,
        handleAddFunds,
        handleRemoveFunds,
        handleDelete,
        totalSaved,
        totalTarget
    } = useSavingsViewModel()

    return (
        <AppLayout>
            <div className="flex items-center justify-between mb-6">
                <PageHeader title="Reservas" subtitle="Organize seu dinheiro por objetivos" />
                <button
                    onClick={() => setIsDialogOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-background rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} weight="bold" />
                    Nova Reserva
                </button>
            </div>

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

            {goals.length === 0 ? (
                <div className="rounded-2xl bg-card p-12 border border-border/50 shadow-sm text-center">
                    <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                        <Plus size={32} className="text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma reserva criada</h3>
                    <p className="text-sm text-muted-foreground mb-6">Crie reservas para organizar seu dinheiro por objetivos</p>
                    <button
                        onClick={() => setIsDialogOpen(true)}
                        className="px-6 py-3 bg-primary text-background rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors"
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
