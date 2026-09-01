"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { getGoals, addGoal, updateGoal, deleteGoal } from "@/lib/storage"
import type { Goal } from "@/lib/types"

export function useGoalsViewModel() {
    const [goals, setGoalsState] = useState<Goal[]>([])
    const [loading, setLoading] = useState(true)
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isFundsOpen, setIsFundsOpen] = useState(false)
    const [editingGoal, setEditingGoal] = useState<Goal | undefined>()
    const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>()

    const loadGoals = useCallback(async () => {
        setGoalsState(await getGoals())
    }, [])

    useEffect(() => {
        loadGoals().finally(() => setLoading(false))
    }, [loadGoals])

    const handleSaveGoal = async (goalData: Omit<Goal, "id" | "createdAt">) => {
        if (editingGoal) {
            await updateGoal(editingGoal.id, goalData)
        } else {
            await addGoal(goalData)
        }
        await loadGoals()
        setIsFormOpen(false)
        setEditingGoal(undefined)
    }

    const handleDeleteGoal = async (goalId: string) => {
        if (confirm("Deseja realmente excluir este objetivo?")) {
            await deleteGoal(goalId)
            await loadGoals()
        }
    }

    const handleAddFunds = async (amount: number) => {
        if (selectedGoal) {
            const newAmount = Math.max(0, selectedGoal.currentAmount + amount)
            await updateGoal(selectedGoal.id, { currentAmount: newAmount })
            await loadGoals()
            setIsFundsOpen(false)
            setSelectedGoal(undefined)
        }
    }

    const totals = useMemo(() => {
        const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0)
        const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0)
        return { totalSaved, totalTarget }
    }, [goals])

    return {
        goals,
        loading,
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
        ...totals
    }
}
