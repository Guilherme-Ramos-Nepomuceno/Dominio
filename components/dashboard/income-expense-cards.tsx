"use client"

import { useState, useEffect } from "react"
import { ArrowUp, ArrowDown, Receipt } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { MiniBarChart } from "./mini-bar-chart"
import type { PeriodType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface IncomeExpenseCardsProps {
  income: number
  expense: number
  transactions: any[]
  period: PeriodType
  onPeriodChange: (period: PeriodType) => void
}

export function IncomeExpenseCards({ income, expense, transactions, period, onPeriodChange }: IncomeExpenseCardsProps) {
  const [incomeData, setIncomeData] = useState<number[]>([])
  const [expenseData, setExpenseData] = useState<number[]>([])

  const expenseCount = transactions.filter((t) => t.type === "expense").length

  useEffect(() => {
    // Generate data based on period
    const generateData = () => {
      if (period === "week") {
        // Last 7 days
        return Array.from({ length: 7 }, (_, i) => {
          const date = new Date()
          date.setDate(date.getDate() - (6 - i))
          return date.toISOString().split("T")[0]
        })
      } else if (period === "month") {
        // Current month, all days
        const now = new Date()
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
        return Array.from({ length: daysInMonth }, (_, i) => {
          const date = new Date(now.getFullYear(), now.getMonth(), i + 1)
          return date.toISOString().split("T")[0]
        })
      } else {
        // Last month, all days
        const now = new Date()
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const daysInLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate()
        return Array.from({ length: daysInLastMonth }, (_, i) => {
          const date = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), i + 1)
          return date.toISOString().split("T")[0]
        })
      }
    }

    const dates = generateData()
    const incomeByDate = dates.map((date) =>
      transactions.filter((t) => t.type === "income" && t.date.startsWith(date)).reduce((sum, t) => sum + t.amount, 0),
    )
    const expenseByDate = dates.map((date) =>
      transactions.filter((t) => t.type === "expense" && t.date.startsWith(date)).reduce((sum, t) => sum + t.amount, 0),
    )

    setIncomeData(incomeByDate)
    setExpenseData(expenseByDate)
  }, [transactions, period])

  const periods: { value: PeriodType; label: string }[] = [
    { value: "week", label: "Semana" },
    { value: "month", label: "Mês" },
    { value: "lastMonth", label: "Mês Anterior" },
  ]

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex gap-2 justify-center">
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => onPeriodChange(p.value)}
            className={cn(
              "px-4 py-2 rounded-[1vw] text-sm font-medium transition-all",
              period === p.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 gap-4">
        {/* Expense Card - shown first on mobile */}
        <div className="rounded-2xl bg-card p-4 shadow-sm border border-border/50 order-2 md:order-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-expense/10">
              <ArrowDown weight="bold" size={16} className="text-expense" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Despesas</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(expense)}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <Receipt size={12} className="text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground">{expenseCount} movimentações</p>
              </div>
            </div>
          </div>
          <MiniBarChart data={expenseData} color="#ef4444" height={32} />
        </div>

        {/* Income Card - shown second on mobile */}
        <div className="rounded-2xl bg-card p-4 shadow-sm border border-border/50 order-1 md:order-2">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-lg bg-income/10">
              <ArrowUp weight="bold" size={16} className="text-income" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Receitas</p>
              <p className="text-lg font-bold text-foreground">{formatCurrency(income)}</p>
            </div>
          </div>
          <MiniBarChart data={incomeData} color="#10b981" height={32} />
        </div>
      </div>
    </div>
  )
}
