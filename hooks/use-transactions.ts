"use client"

import { useState, useEffect, useCallback } from "react"
import type { Transaction, MonthData } from "@/lib/types"
import { getTransactions, getCategories, getSavingsGoals } from "@/lib/storage"
import { getCurrentMonth, isSameMonth } from "@/lib/date-utils"

export function useTransactions(selectedMonth?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const month = selectedMonth || getCurrentMonth()

  const loadTransactions = useCallback(() => {
    setLoading(true)
    const allTransactions = getTransactions()
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
  const categories = getCategories()

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
  const savingsGoals = typeof window !== "undefined" ? getSavingsGoals() : []

  const totalSavings = savingsGoals.reduce((sum: number, goal: any) => sum + (goal.currentAmount || 0), 0)

  const categories = getCategories()
  const transferCategoryId = categories.find((c) => c.name === "Transferência")?.id

  const paidTransactions = monthData.transactions.filter((t) => t.status !== "pending" && t.status !== "cancelled")

  const income = paidTransactions
    .filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId)
      if (t.categoryId === transferCategoryId && t.description?.includes("entre contas")) {
        return false
      }
      return category?.type === "income"
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const expense = paidTransactions
    .filter((t) => {
      const category = categories.find((c) => c.id === t.categoryId)
      if (t.categoryId === transferCategoryId && t.description?.includes("entre contas")) {
        return false
      }
      return category?.type === "expense"
    })
    .reduce((sum, t) => sum + t.amount, 0)

  const checkingBalance = income - expense

  const totalBalance = checkingBalance + totalSavings

  return {
    checkingBalance,
    totalBalance,
    totalSavings,
    income,
    expense,
    transactions: paidTransactions,
  }
}
