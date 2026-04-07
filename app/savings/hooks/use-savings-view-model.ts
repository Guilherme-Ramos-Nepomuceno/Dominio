"use client"

import { useState, useEffect } from "react"
import {
    getSavingsGoals,
    addSavingsGoal,
    deleteSavingsGoal,
    addFundsToSavingsGoal,
    removeFundsFromSavingsGoal,
    updateSavingsGoal,
} from "@/lib/storage"

export function useSavingsViewModel() {
    const [goals, setGoals] = useState<any[]>([])
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [editingGoal, setEditingGoal] = useState<any>(null)

    const loadGoals = () => {
        setGoals(getSavingsGoals())
    }

    useEffect(() => {
        loadGoals()
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
        loadGoals()
        setIsEditDialogOpen(false)
        setEditingGoal(null)
    }

    const handleAddFunds = (id: string, amount: number, cardId?: string) => {
        addFundsToSavingsGoal(id, amount, cardId)
        loadGoals()
    }

    const handleRemoveFunds = (id: string, amount: number, cardId?: string) => {
        removeFundsFromSavingsGoal(id, amount, cardId)
        loadGoals()
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
        handleAddFunds,
        handleRemoveFunds,
        handleDelete,
        totalSaved,
        totalTarget
    }
}
