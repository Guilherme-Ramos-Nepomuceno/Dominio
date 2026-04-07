"use client"

import { useState, useMemo } from "react"
import { useMonthData } from "@/hooks/use-transactions"
import { getCurrentMonth } from "@/lib/date-utils"
import { setSettings, getSettings, getCategories, getCards, getTransactions, cancelTransaction } from "@/lib/storage"
import { useToast } from "@/hooks/use-toast"
import type { CategoryAlert } from "@/app/types/category"

export function useStatsViewModel() {
    const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
    const [filterType, setFilterType] = useState<"all" | "credit">("all")
    const [transactionToCancel, setTransactionToCancel] = useState<string | null>(null)

    const { toast } = useToast()

    const monthData = useMonthData(selectedMonth)
    const settings = getSettings()
    const categories = getCategories()
    const cards = getCards()
    const allTransactions = getTransactions()

    const handleThresholdChange = (newThreshold: number) => {
        setSettings({ spendingGoal: newThreshold })
        window.location.reload()
    }

    const transactionsToDisplay = useMemo(() => {
        if (filterType === "all") {
            return monthData.transactions
        }

        if (filterType === "credit") {
            const creditTransactions: any[] = []
            const creditCards = cards.filter(c => c.type === "credit")
            const creditCardIds = creditCards.map(c => c.id)
            const allCreditHistory = allTransactions.filter(t => creditCardIds.includes(t.cardId || ""))
            const [selYear, selMonth] = selectedMonth.split("-").map(Number)

            allCreditHistory.forEach(t => {
                const transactionDate = new Date(t.date)
                const tYear = transactionDate.getFullYear()
                const tMonth = transactionDate.getMonth() + 1
                const installments = t.installments && t.installments > 1 ? t.installments : 1

                if (installments === 1) {
                    if (t.date.startsWith(selectedMonth)) {
                        if (t.status !== 'paid') creditTransactions.push(t)
                    }
                } else {
                    const monthDiff = (selYear - tYear) * 12 + (selMonth - tMonth)
                    if (monthDiff >= 0 && monthDiff < installments) {
                        if (t.status === 'paid') return;
                        creditTransactions.push({
                            ...t,
                            amount: t.amount / installments,
                            currentInstallment: monthDiff + 1,
                            originalDate: t.date,
                            date: `${selectedMonth}-${String(transactionDate.getDate()).padStart(2, '0')}T12:00:00.000Z`
                        })
                    }
                }
            })
            return creditTransactions
        }
        return []
    }, [filterType, selectedMonth, monthData.transactions, cards, allTransactions])

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

    const confirmCancelTransaction = () => {
        if (transactionToCancel) {
            cancelTransaction(transactionToCancel)
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
            .filter((t) => t.type === "expense")
            .reduce((acc, t) => {
                acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount
                return acc
            }, {} as Record<string, number>),
        [monthData.transactions])

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
        transactionToCancel,
        setTransactionToCancel,
        monthData,
        categories,
        cards,
        groupedTransactions,
        sortedDates,
        confirmCancelTransaction,
        categoryAlerts,
        handleThresholdChange
    }
}
