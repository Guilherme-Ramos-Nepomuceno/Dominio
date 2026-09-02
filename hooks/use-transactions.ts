"use client"

import { useState, useEffect, useCallback } from "react"
import type { Transaction, Category, MonthData } from "@/lib/types"
import { getTransactions, getCategories, getSavingsGoals, getPendingTransactions, getCards } from "@/lib/storage"
import { getCurrentMonth, isSameMonth } from "@/lib/date-utils"

export function useTransactions(selectedMonth?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const month = selectedMonth || getCurrentMonth()

  const loadTransactions = useCallback(async () => {
    setLoading(true)
    const allTransactions = await getTransactions()
    const monthTransactions = allTransactions.filter((t) => isSameMonth(t.date, month + "-01"))
    setTransactions(monthTransactions)
    setLoading(false)
  }, [month])

  useEffect(() => {
    loadTransactions()

    // Listen for storage updates (same window)
    const handleStorageUpdate = () => {
      loadTransactions()
    }
    window.addEventListener("storage-update", handleStorageUpdate)

    return () => {
      window.removeEventListener("storage-update", handleStorageUpdate)
    }
  }, [loadTransactions])

  const refresh = () => {
    loadTransactions()
  }

  return { transactions, loading, refresh }
}

export function useMonthData(month: string): MonthData {
  const { transactions } = useTransactions(month)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    getCategories().then(setCategories)
  }, [])

  const paidTransactions = transactions.filter((t) => t.status !== "pending" && t.status !== "cancelled")

  const income = paidTransactions
    .filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId)
      return category?.type === "income"
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const expense = paidTransactions
    .filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId)
      return category?.type === "expense"
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const balance = income - expense

  return {
    month,
    income,
    expense,
    balance,
    transactions: paidTransactions,
  }
}

export function useTotalBalance(month: string) {
  const monthData = useMonthData(month)
  const [savingsGoals, setSavingsGoals] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const load = async () => {
      const [savings, cats, all] = await Promise.all([getSavingsGoals(), getCategories(), getTransactions()])
      setSavingsGoals(savings)
      setCategories(cats)
      setAllTransactions(all)
    }
    load()

    window.addEventListener("storage-update", load)
    return () => window.removeEventListener("storage-update", load)
  }, [])

  const totalSavings = savingsGoals.reduce((sum: number, goal: any) => sum + (goal.currentAmount || 0), 0)

  const transferCategoryId = categories.find((c) => c.name === "Transferência")?.id
  const isInternalTransfer = (t: Transaction) =>
    t.categoryId === transferCategoryId && t.description?.includes("entre contas")

  // O saldo da conta corrente é acumulado (todo o histórico pago), e não só do mês
  // selecionado — pagar hoje uma conta de um mês anterior precisa refletir no saldo atual,
  // mesmo que o gráfico/relatório mensal continue agrupando pelo mês da despesa.
  const allPaidTransactions = allTransactions.filter((t) => t.status === "paid" && !isInternalTransfer(t))

  const checkingBalance = allPaidTransactions.reduce((sum, t) => {
    const category = categories.find((c) => c.id === t.categoryId)
    if (category?.type === "income") return sum + t.amount
    if (category?.type === "expense") return sum - t.amount
    return sum
  }, 0)

  const totalBalance = checkingBalance + totalSavings

  // income/expense abaixo seguem escopados ao mês selecionado (usados nos cards e
  // mini-gráficos mensais da Home/Stats, não no saldo total).
  const paidTransactions = monthData.transactions.filter((t) => t.status !== "pending" && t.status !== "cancelled")

  const income = paidTransactions
    .filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId)
      if (isInternalTransfer(t)) return false
      return category?.type === "income"
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const expense = paidTransactions
    .filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId)
      if (isInternalTransfer(t)) return false
      return category?.type === "expense"
    })
    .reduce((sum, t) => sum + t.amount, 0)

  return {
    checkingBalance,
    totalBalance,
    totalSavings,
    income,
    expense,
    transactions: paidTransactions,
  }
}

// Pendências de qualquer mês (incluindo meses anteriores não pagos), com a mesma
// deduplicação de recorrência/parcelas usada na tela de Contas a Pagar/Receber.
export function usePendingSummary() {
  const [items, setItems] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const loadPending = useCallback(async () => {
    setLoading(true)
    const [pending, cards] = await Promise.all([getPendingTransactions(), getCards()])

    const visible = pending.filter((t) => {
      if (t.cardId) {
        const card = cards.find((c) => c.id === t.cardId)
        if (card?.type === "credit") return false
      }
      return true
    })

    // Só mostra o que já venceu ou vence hoje — uma recorrência com vencimento daqui
    // a alguns dias não deve gerar alerta antecipado na tela principal.
    const endOfToday = new Date()
    endOfToday.setHours(23, 59, 59, 999)
    const due = visible.filter((t) => new Date(t.date) <= endOfToday)

    const grouped = new Map<string, Transaction>()
    const singles: Transaction[] = []

    due.forEach((t) => {
      const isRecurring = t.recurrence && t.recurrence !== "none"
      const isInstallment = t.installments && t.installments > 1

      if (!isRecurring && !isInstallment) {
        singles.push(t)
        return
      }

      const groupId = t.parentId || t.description
      const existing = grouped.get(groupId)
      if (!existing || new Date(t.date) < new Date(existing.date)) {
        grouped.set(groupId, t)
      }
    })

    const result = [...singles, ...Array.from(grouped.values())].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    )

    setItems(result)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPending()

    const handleStorageUpdate = () => {
      loadPending()
    }
    window.addEventListener("storage-update", handleStorageUpdate)

    return () => {
      window.removeEventListener("storage-update", handleStorageUpdate)
    }
  }, [loadPending])

  const total = items.reduce((sum, t) => sum + t.amount, 0)

  return { items, total, count: items.length, loading, refresh: loadPending }
}
