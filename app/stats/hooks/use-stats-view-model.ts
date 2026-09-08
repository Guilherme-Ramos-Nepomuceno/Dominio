"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useMonthData, isInternalTransfer } from "@/hooks/use-transactions"
import { useFamilyTotals } from "@/hooks/use-family-totals"
import { getCurrentMonth, isSameMonth } from "@/lib/date-utils"
import { setSettings, getSettings, getCategories, getCards, getTransactions, cancelTransaction } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import type { CategoryAlert } from "@/app/types/category"
import type { AppSettings, Category, Card, Transaction } from "@/lib/types"

export function useStatsViewModel() {
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
    const [filterType, setFilterType] = useState<"all" | "credit">("all")
    const [viewMode, setViewMode] = useState<"casal" | "familia">("casal")
    const [transactionToCancel, setTransactionToCancel] = useState<string | null>(null)

    const { toast } = useToast()
    const { isCoupleAccount, familyTotals, loadingFamilyTotals } = useFamilyTotals(selectedMonth, viewMode === "familia")

    const monthData = useMonthData(selectedMonth)
    const [settings, setSettingsState] = useState<AppSettings>({ spendingGoal: 0, currency: "BRL", firstDayOfWeek: 0, categoryGoals: [] })
    const [categories, setCategories] = useState<Category[]>([])
    const [cards, setCards] = useState<Card[]>([])
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([])

    const loadData = useCallback(async () => {
        const [settingsData, categoriesData, cardsData, transactionsData] = await Promise.all([
            getSettings(),
            getCategories(),
            getCards(),
            getTransactions(),
        ])
        setSettingsState(settingsData)
        setCategories(categoriesData)
        setCards(cardsData)
        setAllTransactions(transactionsData)
    }, [])

    useEffect(() => { loadData() }, [loadData])

    const handleThresholdChange = async (newThreshold: number) => {
        await setSettings({ spendingGoal: newThreshold })
        window.location.reload()
    }

    const transactionsToDisplay = useMemo(() => {
        if (filterType === "all") {
            // O gráfico "Fluxo de Gastos" já soma pendentes (ex: ocorrências futuras de
            // recorrência) no total do mês — a lista "Geral" precisa incluir essas mesmas
            // transações, senão meses futuros aparecem com valor no gráfico mas lista vazia.
            return allTransactions.filter((t) => t.status !== "cancelled" && isSameMonth(t.date, selectedMonth + "-01"))
        }

        if (filterType === "credit") {
            const creditTransactions: any[] = []
            const creditCards = cards.filter(c => c.hasCredit)
            const creditCardIds = creditCards.map(c => c.id)
            // Cartão combinado (crédito + débito): só o lado marcado como crédito
            // entra na projeção de fatura — o lado débito não é fatura.
            const allCreditHistory = allTransactions.filter(t => {
                if (!t.cardId || !creditCardIds.includes(t.cardId)) return false
                const card = cards.find(c => c.id === t.cardId)
                if (card?.hasDebit) return t.paymentMethod === "credit"
                return true
            })
            // Cada parcela já é sua própria transação, com data e valor corretos
            // (addTransaction já cria uma linha por parcela) — não precisa (e não
            // deve) recalcular mês/valor aqui, só filtrar pelo mês selecionado.
            allCreditHistory.forEach(t => {
                if (t.status === 'paid' || t.status === 'cancelled') return
                if (t.date.startsWith(selectedMonth)) creditTransactions.push(t)
            })
            return creditTransactions
        }
        return []
    }, [filterType, selectedMonth, cards, allTransactions])

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
            setTransactionToCancel(null)
            window.location.reload()
        }
    }

    const categorySpending = useMemo(() =>
        monthData.transactions
            .filter((t) => t.type === "expense" && !isInternalTransfer(categories, t))
            .reduce((acc, t) => {
                acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount
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
        filterType,
        setFilterType,
        viewMode,
        setViewMode,
        isCoupleAccount,
        familyTotals,
        loadingFamilyTotals,
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
        handleThresholdChange,
        refresh: loadData,
    }
}
