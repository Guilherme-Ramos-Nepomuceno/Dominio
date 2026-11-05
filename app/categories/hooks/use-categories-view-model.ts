"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { getCategories, getTransactions, deleteCategory, updateCategory } from "@/lib/storage"
import { getPlan } from "@/lib/planning-api"
import { parseMonthKey } from "@/lib/period"
import { plannedByCategory } from "@/lib/plan-layout"
import { useSelectedMonth } from "@/lib/selected-month-context"
import type { Category } from "@/lib/types"

export function useCategoriesViewModel() {
    const { selectedMonth, isInMonth } = useSelectedMonth()
    const [categories, setLocalCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [filter, setFilter] = useState<"all" | "income" | "expense">("all")
    const [categoryStats, setCategoryStats] = useState<Record<string, { total: number; count: number }>>({})
    const [planned, setPlanned] = useState<Record<string, number>>({})
    // Transações do mês sem categoria (as que estão em "A classificar").
    const [uncategorizedStats, setUncategorizedStats] = useState<{ total: number; count: number }>({ total: 0, count: 0 })

    const loadCategories = useCallback(async () => {
        const [allCategories, transactions] = await Promise.all([getCategories(), getTransactions()])
        setLocalCategories(allCategories)

        const monthlyTransactions = transactions.filter((t) => isInMonth(t.date))

        const stats: Record<string, { total: number; count: number }> = {}
        allCategories.forEach((category) => {
            const categoryTransactions = monthlyTransactions.filter((t) => t.categoryId === category.id)
            stats[category.id] = {
                total: categoryTransactions.reduce((sum, t) => sum + t.amount, 0),
                count: categoryTransactions.length,
            }
        })

        // Planejado de cada categoria vem do plano do mês (não mais da meta das configurações).
        const { year, month } = parseMonthKey(selectedMonth)
        const plan = await getPlan(year, month).catch(() => null)
        setPlanned(plan ? plannedByCategory(plan) : {})

        setCategoryStats(stats)

        const uncategorized = monthlyTransactions.filter((t) => !t.categoryId && t.status !== "cancelled")
        setUncategorizedStats({
            total: uncategorized.reduce((sum, t) => sum + t.amount, 0),
            count: uncategorized.length,
        })
    }, [selectedMonth, isInMonth])

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

    const handleSaveEdit = async (id: string, updates: Partial<Category>) => {
        await updateCategory(id, updates)
        setEditingCategory(null)
        await loadCategories()
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
        editingCategory,
        setEditingCategory,
        filter,
        setFilter,
        categoryStats,
        uncategorizedStats,
        planned,
        loadCategories,
        handleDelete,
        handleSaveEdit,
        filteredCategories,
        incomeCategories,
        expenseCategories
    }
}
