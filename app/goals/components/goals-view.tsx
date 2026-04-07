"use client"

import { Plus } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { GoalCard } from "./goal-card"
import { GoalFormDialog } from "./goal-form-dialog"
import { AddFundsDialog } from "./add-funds-dialog"
import { formatCurrency } from "@/lib/date-utils"
import { useGoalsViewModel } from "../hooks/use-goals-view-model"

export function GoalsView() {
    const {
        goals,
        isFormOpen,
        setIsFormOpen,
        isFundsOpen,
        setIsFundsOpen,
        editingGoal,
        setEditingGoal,
        selectedGoal,
        setSelectedGoal,
        handleSaveGoal,
        handleDeleteGoal,
        handleAddFunds,
        totalSaved,
        totalTarget
    } = useGoalsViewModel()

    return (
        <AppLayout>
            <PageHeader
                title="Objetivos"
                subtitle="Acompanhe suas metas de economia"
                action={
                    <button
                        onClick={() => {
                            setEditingGoal(undefined)
                            setIsFormOpen(true)
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors"
                    >
                        <Plus weight="bold" size={20} />
                        Novo Objetivo
                    </button>
                }
            />

            {/* Summary Card */}
            {goals.length > 0 && (
                <div className="mb-6 rounded-[20px] bg-gradient-to-br from-primary/10 to-primary/5 p-6 border border-primary/20">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground mb-1">Total Economizado</p>
                            <p className="text-3xl font-bold text-foreground">{formatCurrency(totalSaved)}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-muted-foreground mb-1">Meta Total</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(totalTarget)}</p>
                        </div>
                    </div>

                    <div className="mt-4">
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-500"
                                style={{ width: `${Math.min((totalSaved / totalTarget) * 100, 100)}%` }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Goals Grid */}
            {goals.length === 0 ? (
                <div className="rounded-[20px] bg-card p-12 text-center border border-border/50">
                    <div className="inline-flex p-5 rounded-full bg-muted/50 mb-4">
                        <Plus size={48} weight="light" className="text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum objetivo ainda</h3>
                    <p className="text-sm text-muted-foreground mb-6">Comece criando seu primeiro objetivo de economia</p>
                    <button
                        onClick={() => {
                            setEditingGoal(undefined)
                            setIsFormOpen(true)
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors"
                    >
                        <Plus weight="bold" size={20} />
                        Criar Primeiro Objetivo
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {goals.map((goal) => (
                        <GoalCard
                            key={goal.id}
                            goal={goal}
                            onEdit={() => {
                                setEditingGoal(goal)
                                setIsFormOpen(true)
                            }}
                            onDelete={() => handleDeleteGoal(goal.id)}
                            onAddFunds={() => {
                                setSelectedGoal(goal)
                                setIsFundsOpen(true)
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Dialogs */}
            <GoalFormDialog
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false)
                    setEditingGoal(undefined)
                }}
                onSave={handleSaveGoal}
                initialGoal={editingGoal}
            />

            {selectedGoal && (
                <AddFundsDialog
                    isOpen={isFundsOpen}
                    onClose={() => {
                        setIsFundsOpen(false)
                        setSelectedGoal(undefined)
                    }}
                    goal={selectedGoal}
                    onAddFunds={handleAddFunds}
                />
            )}
        </AppLayout>
    )
}
