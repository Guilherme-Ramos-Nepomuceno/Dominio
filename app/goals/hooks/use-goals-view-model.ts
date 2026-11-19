"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { addGoal, allocateGoalFunds, deleteGoal, getGoals, getSavingsGoals, removeGoalAllocation, updateGoal } from "@/lib/storage"
import type { Goal, SavingsGoal } from "@/lib/types"
import { freeOfSavings } from "@/lib/goal-allocation"
import type { GoalFormData } from "../components/goal-form-sheet"

// Objetivos e as reservas que os alimentam. O progresso de cada objetivo vem da
// API (soma das reservas separadas para ele); aqui só se monta a tela.
export function useGoalsViewModel() {
    const [goals, setGoals] = useState<Goal[]>([])
    const [reserves, setReserves] = useState<SavingsGoal[]>([])
    const [loading, setLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [editingGoal, setEditingGoal] = useState<Goal | undefined>()
    const [allocatingGoal, setAllocatingGoal] = useState<Goal | undefined>()

    const load = useCallback(async () => {
        const [goalList, reserveList] = await Promise.all([getGoals(), getSavingsGoals()])
        setGoals(goalList)
        setReserves(reserveList)
    }, [])

    useEffect(() => {
        load().finally(() => setLoading(false))
    }, [load])

    const openNew = () => {
        setEditingGoal(undefined)
        setIsFormOpen(true)
    }

    const openEdit = (goal: Goal) => {
        setEditingGoal(goal)
        setIsFormOpen(true)
    }

    const closeForm = () => {
        setIsFormOpen(false)
        setEditingGoal(undefined)
    }

    // O progresso não é digitado: `currentAmount` não entra no formulário.
    const handleSaveGoal = async ({ allocations, ...goalData }: GoalFormData) => {
        if (editingGoal) {
            await updateGoal(editingGoal.id, goalData)
            await load()
            closeForm()
            return
        }
        const created = await addGoal({ ...goalData, color: "#71717a", currentAmount: 0, allocations: [] })
        // Separa de cada reserva escolhida. Se alguma falhar, o objetivo já existe:
        // abre a separação dele para a pessoa tentar de novo, em vez de perder o resto.
        let failed = false
        for (const a of allocations) {
            try {
                await allocateGoalFunds(created.id, a.savingsGoalId, a.amount)
            } catch {
                failed = true
            }
        }
        await load()
        closeForm()
        if (failed) setAllocatingGoal(created)
    }

    const handleDeleteGoal = async (goal: Goal) => {
        const hasReserves = (goal.allocations?.length ?? 0) > 0
        const message = hasReserves
            ? `Excluir "${goal.name}"? O dinheiro continua nas reservas, só deixa de estar separado para este objetivo.`
            : `Excluir "${goal.name}"?`
        if (!confirm(message)) return
        await deleteGoal(goal.id)
        await load()
    }

    // Valor absoluto: quanto desta reserva fica para este objetivo (zero tira).
    const handleAllocate = async (goalId: string, savingsGoalId: string, amount: number) => {
        await allocateGoalFunds(goalId, savingsGoalId, amount)
        await load()
        setAllocatingGoal(undefined)
    }

    const handleRemoveAllocation = async (goalId: string, savingsGoalId: string) => {
        await removeGoalAllocation(goalId, savingsGoalId)
        await load()
        setAllocatingGoal(undefined)
    }

    const totalSaved = useMemo(() => goals.reduce((sum, goal) => sum + goal.currentAmount, 0), [goals])
    const totalTarget = useMemo(() => goals.reduce((sum, goal) => sum + goal.targetAmount, 0), [goals])
    // Dinheiro das reservas que ainda não foi separado para nenhum objetivo.
    const totalFree = useMemo(() => reserves.reduce((sum, r) => sum + freeOfSavings(r), 0), [reserves])

    return {
        loading,
        goals,
        reserves,
        totalSaved,
        totalTarget,
        totalFree,
        isFormOpen,
        editingGoal,
        openNew,
        openEdit,
        closeForm,
        allocatingGoal,
        setAllocatingGoal,
        handleSaveGoal,
        handleDeleteGoal,
        handleAllocate,
        handleRemoveAllocation,
    }
}
