"use client"

import { useState, useMemo, useCallback } from "react"
import { useMonthData, isInternalTransfer } from "@/hooks/use-transactions"
import { useFamilyTotals } from "@/hooks/use-family-totals"
import { getInvoiceMonth } from "@/lib/date-utils"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { cancelTransaction } from "@/lib/storage"
import { useCardsQuery, useCategoriesQuery, useSettingsQuery, useTransactionsQuery } from "@/hooks/queries"
import { useToast } from "@/hooks/use-toast"
import type { CategoryAlert } from "@/app/types/category"
import type { AppSettings, Category, Card, Transaction } from "@/lib/types"
import { categoryKeyOf, transactionCategoryLabel } from "@/lib/category-utils"

export interface StatsFilters {
    search: string
    categoryId: string // "all", id da categoria ou UNCATEGORIZED_KEY ("Sem categoria")
    cardId: string // "all" ou id do cartão
    paymentMethod: "all" | "debit" | "credit"
    status: "all" | "paid" | "open"
}

// Referências estáveis para "ainda sem dado" (não invalidam os useMemo).
const DEFAULT_SETTINGS: AppSettings = { spendingGoal: 0, currency: "BRL", firstDayOfWeek: 0, categoryGoals: [] }
const NO_CATEGORIES: Category[] = []
const NO_CARDS: Card[] = []
const NO_TRANSACTIONS: Transaction[] = []

const DEFAULT_FILTERS: StatsFilters = {
    search: "",
    categoryId: "all",
    cardId: "all",
    paymentMethod: "all",
    status: "all",
}

export function useStatsViewModel() {
    const { selectedMonth, setSelectedMonth, isInMonth } = useSelectedMonth()
    const [filters, setFilters] = useState<StatsFilters>(DEFAULT_FILTERS)
    const [viewMode, setViewMode] = useState<"casal" | "familia">("casal")
    const [transactionToCancel, setTransactionToCancel] = useState<string | null>(null)

    const { toast } = useToast()
    const { isCoupleAccount, familyTotals, loadingFamilyTotals } = useFamilyTotals(selectedMonth, viewMode === "familia")

    const monthData = useMonthData(selectedMonth)
    // Do cache compartilhado (hooks/queries.ts); gravações invalidam sozinhas.
    const settingsQuery = useSettingsQuery()
    const categoriesQuery = useCategoriesQuery()
    const cardsQuery = useCardsQuery()
    const transactionsQuery = useTransactionsQuery()
    const settings = settingsQuery.data ?? DEFAULT_SETTINGS
    const categories = categoriesQuery.data ?? NO_CATEGORIES
    const cards = cardsQuery.data ?? NO_CARDS
    const allTransactions = transactionsQuery.data ?? NO_TRANSACTIONS
    // Skeleton só no primeiro carregamento.
    const loading = settingsQuery.isPending || categoriesQuery.isPending || cardsQuery.isPending || transactionsQuery.isPending

    const refetchSettings = settingsQuery.refetch
    const refetchCategories = categoriesQuery.refetch
    const refetchCards = cardsQuery.refetch
    const refetchTransactions = transactionsQuery.refetch
    const refresh = useCallback(async () => {
        await Promise.all([refetchSettings(), refetchCategories(), refetchCards(), refetchTransactions()])
    }, [refetchSettings, refetchCategories, refetchCards, refetchTransactions])

    // Pool "Geral": mesmo critério de sempre — mês pela data da própria transação.
    // O gráfico "Fluxo de Gastos" já soma pendentes (ex: ocorrências futuras de
    // recorrência) no total do mês — essa lista precisa incluir essas mesmas
    // transações, senão meses futuros aparecem com valor no gráfico mas lista vazia.
    const generalPool = useMemo(
        () => allTransactions.filter((t) => t.status !== "cancelled" && isInMonth(t.date)),
        [allTransactions, isInMonth],
    )

    // Se essa transação é do "lado crédito" (entra em fatura) — não depende
    // de mês nenhum, só de cartão+paymentMethod. Precisa ficar separado do
    // pool de fatura porque esse é escopado pelo MÊS DE FECHAMENTO, enquanto
    // o pool geral (usado pro "Débito") é escopado pela data da própria
    // transação — perto da virada do cartão, duas transações do mesmo mês
    // civil podem cair em faturas diferentes, então excluir do "Débito" só
    // quem está no pool de fatura DESSE mês deixava vazar transação de
    // crédito de um mês vizinho pro "Débito".
    const isCreditSideTransaction = useCallback(
        (t: Transaction) => {
            const card = cards.find((c) => c.id === t.cardId)
            if (!card?.hasCredit) return false
            if (card.hasDebit) return t.paymentMethod === "credit"
            return true
        },
        [cards],
    )

    // Pool "Fatura": mês pelo fechamento do cartão, não pela data da compra —
    // cada parcela já é sua própria transação, com data e valor corretos
    // (addTransaction já cria uma linha por parcela).
    const creditPool = useMemo(() => {
        return allTransactions.filter((t) => {
            if (t.status === "cancelled") return false
            if (!isCreditSideTransaction(t)) return false
            const card = cards.find((c) => c.id === t.cardId)
            return getInvoiceMonth(t.date, card?.closingDate) === selectedMonth
        })
    }, [allTransactions, cards, selectedMonth, isCreditSideTransaction])

    const transactionsToDisplay = useMemo(() => {
        const { search, categoryId, cardId, paymentMethod, status } = filters

        let pool: Transaction[]
        if (paymentMethod === "credit") {
            pool = creditPool
        } else if (paymentMethod === "debit") {
            pool = generalPool.filter((t) => !isCreditSideTransaction(t))
        } else {
            const merged = new Map(generalPool.map((t) => [t.id, t]))
            creditPool.forEach((t) => merged.set(t.id, t))
            pool = Array.from(merged.values())
        }

        return pool.filter((t) => {
            if (status === "paid" && t.status !== "paid") return false
            if (status === "open" && t.status === "paid") return false
            if (categoryId !== "all" && categoryKeyOf(t) !== categoryId) return false
            if (cardId !== "all" && t.cardId !== cardId) return false
            if (search.trim()) {
                const q = search.trim().toLowerCase()
                const categoryName = transactionCategoryLabel(categories, t).toLowerCase()
                if (!t.description?.toLowerCase().includes(q) && !categoryName.includes(q)) return false
            }
            return true
        })
    }, [filters, generalPool, creditPool, isCreditSideTransaction, categories])

    const groupedTransactions = useMemo(() => {
        const getLocalDateKey = (date: Date) => date.toLocaleDateString('sv-SE')
        return transactionsToDisplay.reduce((groups, transaction) => {
            const tDate = new Date(transaction.date)
            const dateKey = getLocalDateKey(tDate)
            if (!groups[dateKey]) groups[dateKey] = []
            groups[dateKey].push(transaction)
            return groups
        }, {} as Record<string, any[]>)
    }, [transactionsToDisplay])

    const sortedDates = useMemo(() =>
        Object.keys(groupedTransactions).sort((a, b) => b.localeCompare(a)),
        [groupedTransactions])

    const confirmCancelTransaction = async () => {
        if (transactionToCancel) {
            await cancelTransaction(transactionToCancel)
            toast({
                title: "Lançamento desfeito",
                description: "O lançamento foi revertido com sucesso.",
                variant: "success",
            })
            // Sem recarregar a página: o cancelamento invalida o cache e a
            // lista se atualiza sozinha.
            setTransactionToCancel(null)
        }
    }

    const categorySpending = useMemo(() =>
        monthData.transactions
            .filter((t) => t.type === "expense" && !isInternalTransfer(categories, t))
            .reduce((acc, t) => {
                const key = categoryKeyOf(t)
                acc[key] = (acc[key] || 0) + t.amount
                return acc
            }, {} as Record<string, number>),
        [monthData.transactions, categories])

    const totalExpenses = useMemo(() =>
        Object.values(categorySpending).reduce((sum, val) => sum + val, 0),
        [categorySpending])

    const categoryAlerts = useMemo(() => {
        const goals = settings.categoryGoals || []
        return goals.map((goal) => {
            const spent = categorySpending[goal.categoryId] || 0
            const targetAmount = (totalExpenses * goal.percentage) / 100
            const category = categories.find((c) => c.id === goal.categoryId)
            if (spent > targetAmount) return { categoryName: category?.name, percentage: goal.percentage, spent, target: targetAmount, excess: spent - targetAmount }
            return null
        }).filter(Boolean) as CategoryAlert[]
    }, [settings.categoryGoals, categorySpending, totalExpenses, categories])

    return {
        selectedMonth,
        setSelectedMonth,
        filters,
        setFilters,
        viewMode,
        setViewMode,
        isCoupleAccount,
        familyTotals,
        loadingFamilyTotals,
        loading,
        transactionToCancel,
        setTransactionToCancel,
        monthData,
        categories,
        cards,
        allTransactions,
        groupedTransactions,
        sortedDates,
        confirmCancelTransaction,
        categoryAlerts,
        refresh,
    }
}
