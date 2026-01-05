"use client"

import { useState } from "react"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"
import { getCategories, getSettings, getTransactions } from "@/lib/storage"
import type { Transaction } from "@/lib/types"
import { formatCurrency, formatShortMonth, getNextMonth, getPreviousMonth } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface StackedBarChartProps {
  transactions: Transaction[]
  currentMonth: string
  threshold?: number
  onThresholdChange?: (value: number) => void
  onMonthChange?: (month: string) => void
}

interface CategoryData {
  categoryId: string
  name: string
  color: string
  amount: number
}

export function StackedBarChart({
  transactions,
  currentMonth,
  threshold: customThreshold,
  onThresholdChange,
  onMonthChange,
}: StackedBarChartProps) {
  const settings = getSettings()
  const categories = getCategories()
  const allTransactions = getTransactions()

  const threshold = customThreshold ?? settings.spendingGoal
  const [isEditingThreshold, setIsEditingThreshold] = useState(false)
  const [thresholdInput, setThresholdInput] = useState(threshold.toString())

  const prevMonth = getPreviousMonth(currentMonth)
  const nextMonth = getNextMonth(currentMonth)

  // Calculate category totals for each month
  const getMonthData = (month: string) => {
    const monthTransactions = allTransactions.filter((t) => t.date.startsWith(month))
    const data: CategoryData[] = []

    monthTransactions.forEach((transaction) => {
      const category = categories.find((c) => c.id === transaction.categoryId)
      if (category?.type !== "expense") return

      const existing = data.find((d) => d.categoryId === category.id)
      if (existing) {
        existing.amount += transaction.amount
      } else {
        data.push({
          categoryId: category.id,
          name: category.name,
          color: category.color,
          amount: transaction.amount,
        })
      }
    })

    return data.sort((a, b) => b.amount - a.amount)
  }

  const prevMonthData = getMonthData(prevMonth)
  const currentMonthData = getMonthData(currentMonth)
  const nextMonthData = getMonthData(nextMonth)

  const prevTotal = prevMonthData.reduce((sum, cat) => sum + cat.amount, 0)
  const currentTotal = currentMonthData.reduce((sum, cat) => sum + cat.amount, 0)
  const nextTotal = nextMonthData.reduce((sum, cat) => sum + cat.amount, 0)

  const maxValue = Math.max(prevTotal, currentTotal, nextTotal, threshold) * 1.1

  const handleThresholdClick = () => {
    setIsEditingThreshold(true)
    setThresholdInput(threshold.toString())
  }

  const handleThresholdSave = () => {
    const newValue = Number.parseFloat(thresholdInput)
    if (!isNaN(newValue) && newValue > 0) {
      onThresholdChange?.(newValue)
    }
    setIsEditingThreshold(false)
  }

  const thresholdPercentage = (threshold / maxValue) * 100

  const renderBar = (data: CategoryData[], total: number, label: string, month: string, isCurrent: boolean) => (
    <div className="flex-1 flex flex-col items-center">
      <div className="w-full h-64 relative">
        {data.length === 0 ? (
          <div className="w-full h-full flex items-end justify-center">
            <div className="w-16 h-2 bg-muted rounded-full" />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col-reverse">
            {data.map((cat) => {
              const heightPercentage = (cat.amount / maxValue) * 100

              return (
                <div
                  key={cat.categoryId}
                  className="relative group/bar transition-all hover:brightness-110 w-full"
                  style={{
                    backgroundColor: cat.color,
                    height: `${heightPercentage}%`,
                    minHeight: heightPercentage > 0 ? "8px" : "0",
                    opacity: isCurrent ? 1 : 0.6,
                  }}
                >
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover/bar:opacity-100 transition-opacity pointer-events-none z-50">
                    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg min-w-35 whitespace-nowrap">
                      <p className="text-xs font-semibold text-foreground mb-1">{cat.name}</p>
                      <p className="text-sm font-bold" style={{ color: cat.color }}>
                        {formatCurrency(cat.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">{((cat.amount / total) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div className="mt-3 text-center">
        <p className={cn("text-xs font-medium mb-1", isCurrent ? "text-primary" : "text-muted-foreground")}>{label}</p>
        <p className={cn("text-lg font-bold", total > threshold ? "text-expense" : "text-foreground")}>
          {formatCurrency(total)}
        </p>
      </div>
    </div>
  )

  return (
    <div className="rounded-[20px] bg-card p-6 shadow-sm border border-border/50">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">Análise de Gastos por Mês</h3>
          <p className="text-sm text-muted-foreground">Comparação entre meses</p>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted-foreground mb-1">Meta Mensal</p>
          <div onClick={handleThresholdClick} className="cursor-pointer">
            {isEditingThreshold ? (
              <input
                type="number"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                onBlur={handleThresholdSave}
                onKeyDown={(e) => e.key === "Enter" && handleThresholdSave()}
                className="w-32 px-2 py-1 text-lg font-bold bg-background border border-border rounded-lg text-right"
                autoFocus
              />
            ) : (
              <p className="text-2xl font-bold text-expense hover:text-expense/80 transition-colors">
                {formatCurrency(threshold)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chart with 3 months */}
      <div className="relative">
        <div className="flex gap-8 items-end justify-center">
          {renderBar(prevMonthData, prevTotal, formatShortMonth(prevMonth), prevMonth, false)}
          {renderBar(currentMonthData, currentTotal, formatShortMonth(currentMonth), currentMonth, true)}
          {renderBar(nextMonthData, nextTotal, formatShortMonth(nextMonth), nextMonth, false)}
        </div>

        {/* Threshold line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-expense/60 -mt-10"
          style={{ bottom: `calc(${thresholdPercentage}% + 2.5rem)` }}
        >
          <span className="absolute right-0 -top-5 text-xs font-semibold text-expense">Meta</span>
        </div>
      </div>

      {/* Navigation */}
      {onMonthChange && (
        <div className="flex items-center justify-center gap-4 mt-6 pt-6 border-t border-border">
          <button onClick={() => onMonthChange(prevMonth)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <CaretLeft size={20} weight="bold" />
          </button>
          <span className="text-sm font-medium text-foreground min-w-30 text-center">
            {formatShortMonth(currentMonth)}
          </span>
          <button onClick={() => onMonthChange(nextMonth)} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <CaretRight size={20} weight="bold" />
          </button>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-border">
        {currentMonthData.map((cat) => (
          <div key={cat.categoryId} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="text-xs font-medium text-muted-foreground">{cat.name}</span>
            <span className="text-xs font-bold text-foreground">{formatCurrency(cat.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
