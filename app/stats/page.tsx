"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StackedBarChart } from "@/components/charts/stacked-bar-chart"
import { PeriodSelector } from "@/components/dashboard/period-selector"
import { useMonthData } from "@/hooks/use-transactions"
import { getCurrentMonth, formatMonth } from "@/lib/date-utils"
import { setSettings, getSettings, getCategories } from "@/lib/storage"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { CategoryAlert } from "../types/category"

export default function StatsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const monthData = useMonthData(selectedMonth)
  const settings = getSettings()
  const categories = getCategories()

  const handleThresholdChange = (newThreshold: number) => {
    setSettings({ spendingGoal: newThreshold })
    window.location.reload()
  }

  const today = new Date().toISOString().split("T")[0]
  // Correção no cálculo de yesterday para garantir compatibilidade de fuso/timestamp
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toISOString().split("T")[0]

  const todayTransactions = monthData.transactions.filter((t) => t.date.startsWith(today))
  const yesterdayTransactions = monthData.transactions.filter((t) => t.date.startsWith(yesterday))
  const pastTransactions = monthData.transactions.filter(
    (t) => !t.date.startsWith(today) && !t.date.startsWith(yesterday),
  )

  // CORREÇÃO APLICADA AQUI
 const TransactionItem = ({ transaction }: { transaction: any }) => {
    // Criamos o objeto Data com a string completa (preservando o horário salvo)
    const dateObj = new Date(transaction.date)

    // Formatamos para dia/mês/ano hora:minuto
    const formattedDate = dateObj.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric", // ou '2-digit' se preferir ano curto
      hour: "2-digit",
      minute: "2-digit",
    })

    return (
      <div className="flex items-center justify-between p-4 rounded-[1vw] bg-card border border-border/50">
        <div className="flex-1">
          <p className="font-semibold text-foreground">{transaction.description}</p>
          <p className="text-sm text-muted-foreground" suppressHydrationWarning>
            {formattedDate}
          </p>
        </div>
        <p
          className={cn(
            "text-lg font-bold",
            transaction.type === "income" ? "text-income" : "text-expense",
          )}
        >
          {transaction.type === "expense" ? "-" : "+"}
          {formatCurrency(transaction.amount)}
        </p>
      </div>
    )
  }

  const categoryGoals = settings.categoryGoals || []
  const categorySpending = monthData.transactions
    .filter((t) => t.type === "expense")
    .reduce(
      (acc, t) => {
        acc[t.categoryId] = (acc[t.categoryId] || 0) + t.amount
        return acc
      },
      {} as Record<string, number>,
    )

  const totalExpenses = Object.values(categorySpending).reduce((sum, val) => sum + val, 0)

  const categoryAlerts: Array<CategoryAlert | null> = categoryGoals
    .map((goal) => {
      const spent = categorySpending[goal.categoryId] || 0
      const targetAmount = (totalExpenses * goal.percentage) / 100
      const category = categories.find((c) => c.id === goal.categoryId)

      if (spent > targetAmount) {
        return {
          categoryName: category?.name || "Categoria",
          percentage: goal.percentage,
          spent,
          target: targetAmount,
          excess: spent - targetAmount,
        }
      }
      return null
    })
    .filter(Boolean) as CategoryAlert[] // Type assertion para limpar nulls

  return (
    <AppLayout>
      <PeriodSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} className="mb-6" />

      <PageHeader title={formatMonth(selectedMonth)} subtitle="Análise detalhada dos seus gastos" />

      {categoryAlerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {categoryAlerts.map((alert, idx) => (
            <div key={idx} className="rounded-[1vw] bg-expense/10 border border-expense/30 p-4">
              <p className="text-sm font-semibold text-expense">⚠️ Meta de {alert?.categoryName} excedida!</p>
              <p className="text-xs text-muted-foreground mt-1">
                Você gastou {formatCurrency(alert?.spent || 0)} de {formatCurrency(alert?.target || 0)} ({alert?.percentage}%).
                Excesso: {formatCurrency(alert?.excess || 0)}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-6">
        <StackedBarChart
          transactions={monthData.transactions}
          currentMonth={selectedMonth}
          onThresholdChange={handleThresholdChange}
          onMonthChange={setSelectedMonth}
        />
      </div>

      <div className="space-y-6">
        {todayTransactions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Hoje</h2>
            <div className="space-y-3">
              {todayTransactions.map((t) => (
                <TransactionItem key={t.id} transaction={t} />
              ))}
            </div>
          </div>
        )}

        {yesterdayTransactions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Ontem</h2>
            <div className="space-y-3">
              {yesterdayTransactions.map((t) => (
                <TransactionItem key={t.id} transaction={t} />
              ))}
            </div>
          </div>
        )}

        {pastTransactions.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">Dias Anteriores</h2>
            <div className="space-y-3">
              {pastTransactions.map((t) => (
                <TransactionItem key={t.id} transaction={t} />
              ))}
            </div>
          </div>
        )}

        {monthData.transactions.length === 0 && (
          <div className="rounded-2xl bg-card p-8 text-center border border-border/50">
            <p className="text-muted-foreground">Nenhuma transação neste período</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}