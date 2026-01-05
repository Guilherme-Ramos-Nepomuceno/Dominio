"use client"

import { ArrowUp, ArrowDown } from "@phosphor-icons/react"
import { formatCurrency, getPreviousMonth } from "@/lib/date-utils"
import { useMonthData } from "@/hooks/use-transactions"
import { cn } from "@/lib/utils"

interface MonthComparisonProps {
  currentMonth: string
}

export function MonthComparison({ currentMonth }: MonthComparisonProps) {
  const previousMonth = getPreviousMonth(currentMonth)

  const currentData = useMonthData(currentMonth)
  const previousData = useMonthData(previousMonth)

  const expenseDiff = currentData.expense - previousData.expense
  const expensePercent = previousData.expense > 0 ? (expenseDiff / previousData.expense) * 100 : 0

  const incomeDiff = currentData.income - previousData.income
  const incomePercent = previousData.income > 0 ? (incomeDiff / previousData.income) * 100 : 0

  const balanceDiff = currentData.balance - previousData.balance

  return (
    <div className="rounded-[20px] bg-card p-6 border border-border/50 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground mb-4">Comparação com Mês Anterior</h3>

      <div className="space-y-4">
        {/* Income comparison */}
        <div className="flex items-center justify-between p-3 rounded-[1vw] bg-income/5 border border-income/20">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Receitas</p>
            <p className="text-lg font-bold text-income">{formatCurrency(currentData.income)}</p>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm",
              incomeDiff >= 0 ? "bg-income/20 text-income" : "bg-expense/20 text-expense",
            )}
          >
            {incomeDiff >= 0 ? <ArrowUp weight="bold" size={16} /> : <ArrowDown weight="bold" size={16} />}
            {Math.abs(incomePercent).toFixed(1)}%
          </div>
        </div>

        {/* Expense comparison */}
        <div className="flex items-center justify-between p-3 rounded-[1vw] bg-expense/5 border border-expense/20">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Despesas</p>
            <p className="text-lg font-bold text-expense">{formatCurrency(currentData.expense)}</p>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm",
              expenseDiff <= 0 ? "bg-income/20 text-income" : "bg-expense/20 text-expense",
            )}
          >
            {expenseDiff >= 0 ? <ArrowUp weight="bold" size={16} /> : <ArrowDown weight="bold" size={16} />}
            {Math.abs(expensePercent).toFixed(1)}%
          </div>
        </div>

        {/* Balance comparison */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Diferença no Saldo</p>
              <p className={cn("text-xl font-bold", balanceDiff >= 0 ? "text-income" : "text-expense")}>
                {balanceDiff >= 0 ? "+" : ""}
                {formatCurrency(balanceDiff)}
              </p>
            </div>

            <div className={cn("text-xs font-medium", balanceDiff >= 0 ? "text-income" : "text-expense")}>
              {balanceDiff >= 0 ? "Melhor que antes" : "Pior que antes"}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
