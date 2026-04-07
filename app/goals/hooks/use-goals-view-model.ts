"use client"

import { useState, useEffect, useMemo } from "react"
import { getGoals, addGoal, updateGoal, setGoals } from "@/lib/storage"
import type { Goal } from "@/lib/types"

export function useGoalsViewModel() {
    const [goals, setGoalsState] = useState<Goal[]>([])
    const [isFormOpen, setIsFormOpen] = useState(false)
    const [isFundsOpen, setIsFundsOpen] = useState(false)
    const [editingGoal, setEditingGoal] = useState<Goal | undefined>()
    const [selectedGoal, setSelectedGoal] = useState<Goal | undefined>()

    const loadGoals = () => {
        setGoalsState(getGoals())
    }

    useEffect(() => {
        loadGoals()
    }, [])

    const handleSaveGoal = (goalData: Omit<Goal, "id" | "createdAt">) => {
        if (editingGoal) {
            updateGoal(editingGoal.id, goalData)
        } else {
            addGoal(goalData)
        }
        loadGoals()
        setIsFormOpen(false)
        setEditingGoal(undefined)
    }

    const handleDeleteGoal = (goalId: string) => {
        if (confirm("Deseja realmente excluir este objetivo?")) {
            const filtered = goals.filter((g) => g.id !== goalId)
            setGoals(filtered)
            setGoalsState(filtered)
        }
    }

    const handleAddFunds = (amount: number) => {
        if (selectedGoal) {
            const newAmount = Math.max(0, selectedGoal.currentAmount + amount)
            updateGoal(selectedGoal.id, { currentAmount: newAmount })
            loadGoals()
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
