"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { getCategories, getTransactions, deleteCategory, getSettings } from "@/lib/storage"
import type { Category } from "@/lib/types"

export function useCategoriesViewModel() {
    const [categories, setLocalCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [filter, setFilter] = useState<"all" | "income" | "expense">("all")
    const [categoryStats, setCategoryStats] = useState<
        Record<string, { total: number; count: number; percentage: number }>
    >({})
    const [categoryGoals, setCategoryGoals] = useState<any[]>([])

    const loadCategories = useCallback(async () => {
        const [allCategories, transactions, settings] = await Promise.all([
            getCategories(),
            getTransactions(),
            getSettings(),
        ])
        setLocalCategories(allCategories)

        const currentCategoryGoals = settings.categoryGoals || []
        setCategoryGoals(currentCategoryGoals)
        const currentMonth = new Date().toISOString().slice(0, 7)
        const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonth))
        const globalSpendingGoal = settings.spendingGoal || 0

        const stats: Record<string, { total: number; count: number; percentage: number }> = {}

        allCategories.forEach((category) => {
            const categoryTransactions = monthlyTransactions.filter((t) => t.categoryId === category.id)
            const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)
            const goalData = currentCategoryGoals.find((g: any) => g.categoryId === category.id)
            const goalPercentValue = goalData?.percentage || 0

            let percentage = 0

            if (goalPercentValue > 0 && category.type === "expense") {
                const allowedAmount = (globalSpendingGoal * goalPercentValue) / 100
                if (allowedAmount > 0) {
                    percentage = (total / allowedAmount) * 100
                } else if (total > 0) {
                    percentage = 100
                }
            }

            stats[category.id] = {
                total,
                count: categoryTransactions.length,
                percentage,
            }
        })

        setCategoryStats(stats)
    }, [])

    useEffect(() => {
        loadCategories().finally(() => setLoading(false))
    }, [loadCategories])

    const handleDelete = async (id: string) => {
        const transactions = await getTransactions()
        const hasTransactions = transactions.some((t) => t.categoryId === id)

        if (hasTransactions) {
            alert("Não é possível excluir uma categoria que possui transações vinculadas.")
            return
        }

        if (confirm("Deseja excluir esta categoria?")) {
            await deleteCategory(id)
            await loadCategories()
        }
    }

    const filteredCategories = useMemo(() =>
        categories.filter((c) => filter === "all" || c.type === filter),
        [categories, filter]
    )

    const incomeCategories = useMemo(() =>
        filteredCategories.filter((c) => c.type === "income"),
        [filteredCategories]
    )

    const expenseCategories = useMemo(() =>
        filteredCategories.filter((c) => c.type === "expense"),
        [filteredCategories]
    )

    return {
        categories,
        loading,
        isDialogOpen,
        setIsDialogOpen,
        filter,
        setFilter,
        categoryStats,
        categoryGoals,
        loadCategories,
        handleDelete,
        filteredCategories,
        incomeCategories,
        expenseCategories
    }
}
