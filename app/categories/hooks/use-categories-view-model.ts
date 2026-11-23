"use client"

import { useState, useMemo, useCallback } from "react"
import { deleteCategory, updateCategory } from "@/lib/storage"
import { readTransactions } from "@/lib/cached-reads"
import { useCategoriesQuery, usePlanQuery, useTransactionsQuery } from "@/hooks/queries"
import { parseMonthKey } from "@/lib/period"
import { plannedByCategory } from "@/lib/plan-layout"
import { useSelectedMonth } from "@/lib/selected-month-context"
import type { Category, Transaction } from "@/lib/types"

// Referências estáveis para "ainda sem dado" (não invalidam os useMemo).
const NO_CATEGORIES: Category[] = []
const NO_TRANSACTIONS: Transaction[] = []

export function useCategoriesViewModel() {
    const { selectedMonth, isInMonth } = useSelectedMonth()
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [filter, setFilter] = useState<"all" | "income" | "expense">("all")

    // Categorias, histórico e plano do mês vêm do cache compartilhado;
    // criar/editar/excluir invalida e a tela se atualiza sozinha.
    const categoriesQuery = useCategoriesQuery()
    const transactionsQuery = useTransactionsQuery()
    const { year, month } = parseMonthKey(selectedMonth)
    const planQuery = usePlanQuery(year, month)
    const categories = categoriesQuery.data ?? NO_CATEGORIES
    const transactions = transactionsQuery.data ?? NO_TRANSACTIONS
    const plan = planQuery.data
    // Skeleton só no primeiro carregamento (o planejado entra junto, como antes).
    const loading = categoriesQuery.isPending || transactionsQuery.isPending || planQuery.isPending

    const monthlyTransactions = useMemo(() => transactions.filter((t) => isInMonth(t.date)), [transactions, isInMonth])

    const categoryStats = useMemo(() => {
        const stats: Record<string, { total: number; count: number }> = {}
        categories.forEach((category) => {
            const categoryTransactions = monthlyTransactions.filter((t) => t.categoryId === category.id)
            stats[category.id] = {
                total: categoryTransactions.reduce((sum, t) => sum + t.amount, 0),
                count: categoryTransactions.length,
            }
        })
        return stats
    }, [categories, monthlyTransactions])

    // Planejado de cada categoria vem do plano do mês (não mais da meta das configurações).
    // Plano indisponível = nada planejado.
    const planned = useMemo<Record<string, number>>(() => (plan ? plannedByCategory(plan) : {}), [plan])

    // Transações do mês sem categoria (as que estão em "A classificar").
    const uncategorizedStats = useMemo(() => {
        const uncategorized = monthlyTransactions.filter((t) => !t.categoryId && t.status !== "cancelled")
        return {
            total: uncategorized.reduce((sum, t) => sum + t.amount, 0),
            count: uncategorized.length,
        }
    }, [monthlyTransactions])

    // cancelRefetch: false = pega carona na revalidação que a gravação já
    // disparou, sem buscar de novo.
    const refetchCategories = categoriesQuery.refetch
    const refetchTransactions = transactionsQuery.refetch
    const refetchPlan = planQuery.refetch
    const loadCategories = useCallback(async () => {
        await Promise.all([
            refetchCategories({ cancelRefetch: false }),
            refetchTransactions({ cancelRefetch: false }),
            refetchPlan({ cancelRefetch: false }),
        ])
    }, [refetchCategories, refetchTransactions, refetchPlan])

    const handleDelete = async (id: string) => {
        const transactions = await readTransactions()
        const hasTransactions = transactions.some((t) => t.categoryId === id)

        if (hasTransactions) {
            alert("Não é possível excluir uma categoria que possui transações vinculadas.")
            return
        }

        if (confirm("Deseja excluir esta categoria?")) {
            await deleteCategory(id)
        }
    }

    const handleSaveEdit = async (id: string, updates: Partial<Category>) => {
        await updateCategory(id, updates)
        setEditingCategory(null)
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
