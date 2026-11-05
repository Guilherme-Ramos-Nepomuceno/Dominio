"use client"

import { PiggyBank, Plus } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { SavingsGoalCard } from "./savings-goal-card"
import { AddSavingsGoalDialog } from "./add-savings-goal-dialog"
import { EditSavingsDialog } from "./edit-savings-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { formatCurrency } from "@/lib/date-utils"
import { formatMoneyWhole } from "@/lib/plan-layout"
import { useSavingsViewModel } from "../hooks/use-savings-view-model"

export function SavingsView() {
    const {
        loading,
        goals,
        isDialogOpen,
        setIsDialogOpen,
        isEditDialogOpen,
        setIsEditDialogOpen,
        editingGoal,
        handleAddGoal,
        handleEdit,
        handleSaveEdit,
        handleDelete,
        totalSaved,
        totalTarget
    } = useSavingsViewModel()

    const pct = totalTarget > 0 ? Math.floor((totalSaved / totalTarget) * 100) : 0

    return (
        <AppLayout primaryAction={{ label: "Nova reserva", onPress: () => setIsDialogOpen(true) }}>
            <PageHeader back="/all-menus"
                title="Reservas"
                subtitle="Dinheiro guardado por objetivo"
            />

            {loading ? (
                <div className="max-w-2xl mx-auto space-y-10" aria-busy>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-32 rounded-full" />
                        <Skeleton className="h-12 w-56 rounded-xl" />
                        <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                    <Skeleton className="h-28 rounded-xl" />
                </div>
            ) : goals.length === 0 ? (
                <div className="max-w-2xl mx-auto py-10 text-center space-y-3">
                    <PiggyBank size={40} weight="duotone" className="mx-auto text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Nenhuma reserva ainda</h2>
                    <p className="text-sm text-muted-foreground">
                        Separe o dinheiro guardado por objetivo — emergência, viagem, troca do carro.
                    </p>
                    <button
                        type="button"
                        onClick={() => setIsDialogOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                        <Plus size={16} weight="bold" />
                        Criar a primeira reserva
                    </button>
                </div>
            ) : (
                // Página corrida, no desenho do Planejar: herói solto (o total
                // guardado) e a lista das reservas, sem um cartão em volta de cada parte.
                <div className="max-w-2xl mx-auto space-y-10">
                    <section aria-labelledby="savings-total-label">
                        <p id="savings-total-label" className="text-sm text-muted-foreground">
                            Total guardado
                        </p>
                        <p className="mt-1 text-5xl font-semibold tracking-tight leading-none tabular-nums text-foreground">
                            {formatCurrency(totalSaved)}
                        </p>
                        {totalTarget > 0 && (
                            <p className="mt-3 text-sm text-muted-foreground tabular-nums">
                                <span className="font-semibold text-foreground">{pct}%</span> das metas ·{" "}
                                {formatMoneyWhole(totalTarget)} no total
                            </p>
                        )}
                        {/* Com uma reserva só, a barra dela (logo abaixo) já diz isso. */}
                        {goals.length > 1 && totalTarget > 0 && (
                            <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: "var(--plan-track)" }} aria-hidden>
                                <div className="h-full rounded-full bg-foreground/60 transition-[width] duration-500" style={{ width: `${Math.min(100, pct)}%` }} />
                            </div>
                        )}
                    </section>

                    <section aria-labelledby="savings-list-title">
                        <SectionTitle id="savings-list-title">
                            {goals.length === 1 ? "Sua reserva" : `Suas ${goals.length} reservas`}
                        </SectionTitle>
                        <ul className="mt-1 divide-y divide-border">
                            {goals.map((goal) => (
                                <SavingsGoalCard key={goal.id} goal={goal} onDelete={handleDelete} onEdit={handleEdit} />
                            ))}
                        </ul>
                    </section>
                </div>
            )}

            <AddSavingsGoalDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onAdd={handleAddGoal} />

            {isEditDialogOpen && editingGoal && (
                <EditSavingsDialog goal={editingGoal} onSave={handleSaveEdit} onClose={() => setIsEditDialogOpen(false)} />
            )}
        </AppLayout>
    )
}
