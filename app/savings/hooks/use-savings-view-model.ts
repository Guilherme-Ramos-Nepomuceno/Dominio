"use client"

import { useState, useEffect, useCallback } from "react"
import {
    getSavingsGoals,
    addSavingsGoal,
    deleteSavingsGoal,
    updateSavingsGoal,
} from "@/lib/storage"

export function useSavingsViewModel() {
    const [goals, setGoals] = useState<any[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editingGoal, setEditingGoal] = useState<any>(null)

    const loadGoals = useCallback(async () => {
        setGoals(await getSavingsGoals())
    }, [])

    useEffect(() => {
        loadGoals()
    }, [loadGoals])

    const handleAddGoal = async (goalData: any) => {
        await addSavingsGoal(goalData)
        await loadGoals()
    }

    const handleEdit = (goal: any) => {
        setEditingGoal(goal)
        setIsEditDialogOpen(true)
    }

    const handleSaveEdit = async (id: string, updates: any) => {
        await updateSavingsGoal(id, updates)
        await loadGoals()
        setIsEditDialogOpen(false)
        setEditingGoal(null)
    }

    const handleDelete = async (id: string) => {
        const goal = goals.find((g) => g.id === id)
        if (goal && goal.currentAmount > 0) {
            if (!confirm("Esta reserva possui fundos. Ao excluir, o valor será perdido. Deseja continuar?")) {
                return
            }
        }
        await deleteSavingsGoal(id)
        await loadGoals()
    }

    const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0)
    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0)

    return {
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
    }
}
