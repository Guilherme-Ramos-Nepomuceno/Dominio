"use client"

import { useEffect, useState } from "react"
import { MiniBarChart, type ChartDataPoint } from "./mini-bar-chart"
import { formatCurrency } from "@/lib/date-utils"
import type { PeriodType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface IncomeExpenseCardsProps {
  income: number
  expense: number
  transactions?: any[]
  period: PeriodType
  onPeriodChange: (period: PeriodType) => void
}

export function IncomeExpenseCards({
  income,
  expense,
  transactions = [],
  period,
  onPeriodChange,
}: IncomeExpenseCardsProps) {
  const [incomeChartData, setIncomeChartData] = useState<ChartDataPoint[]>([])
  const [expenseChartData, setExpenseChartData] = useState<ChartDataPoint[]>([])

  useEffect(() => {
    const generateChartData = () => {
        const dataPoints: { dateStr: string, dateObj: Date }[] = []
        const now = new Date()
        const formatDateLocalYYYYMMDD = (date: Date) => {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, "0")
          const day = String(date.getDate()).padStart(2, "0")
          return `${year}-${month}-${day}`
        }

        if (period === "week") {
          for (let i = 6; i >= 0; i--) {
            const d = new Date()
            d.setDate(now.getDate() - i)
            dataPoints.push({ dateStr: formatDateLocalYYYYMMDD(d), dateObj: d })
          }
        } else {
          const targetMonth = period === "month" ? now.getMonth() : now.getMonth() - 1
          let targetYear = now.getFullYear()
          let adjustedMonth = targetMonth;
          if (targetMonth < 0) { adjustedMonth = 11; targetYear = targetYear - 1; }
          const daysInMonth = new Date(targetYear, adjustedMonth + 1, 0).getDate()

          for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(targetYear, adjustedMonth, i)
            dataPoints.push({ dateStr: formatDateLocalYYYYMMDD(d), dateObj: d })
          }
        }

        const processTransactions = (type: "income" | "expense"): ChartDataPoint[] => {
          return dataPoints.map(({ dateStr, dateObj }) => {
            const totalValue = transactions
              .filter((t) => t.type === type && t.date.startsWith(dateStr))
              .reduce((sum, t) => sum + t.amount, 0)

            let label = "";
            if (period === 'week') {
               label = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(dateObj).replace('.', '');
            } else {
               // --- MUDANÇA AQUI: Força o formato "01", "02", "03" ---
               // Pega o dia e adiciona o zero à esquerda se necessário
               label = String(dateObj.getDate()).padStart(2, '0');
            }
            const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(dateObj);
            
            return { value: totalValue, label: label, fullDate: fullDate }
          })
        }
        setIncomeChartData(processTransactions("income"))
        setExpenseChartData(processTransactions("expense"))
    }
    generateChartData()
  }, [transactions, period])

  return (
    <div className="space-y-4  mt-4">
      {/* Seletor Deslizante */}
      <div className="flex justify-center">
        <div className="relative grid grid-cols-2 bg-card p-1 rounded-lg border border-white/5 w-[200px]">
            <div 
              className={cn(
                "absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-foreground rounded-md shadow-sm transition-transform duration-300 ease-in-out",
                period === "month" ? "translate-x-full" : "translate-x-0"
              )}
            />
            <button
                onClick={() => onPeriodChange("week")}
                className={cn(
                "relative z-10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center transition-colors duration-200",
                period === "week" ? "text-background" : "text-neutral-500 hover:text-neutral-300"
                )}
            >
                Semanal
            </button>
            <button
                onClick={() => onPeriodChange("month")}
                className={cn(
                "relative z-10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center transition-colors duration-200",
                period === "month" ? "text-background" : "text-neutral-500 hover:text-neutral-300"
                )}
            >
                Mensal
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Income Card */}
        <div className="rounded-2xl bg-card p-6 border border-white/5 relative overflow-hidden group">
           <div className="flex items-end justify-between relative z-10 gap-4">
              <div className="flex flex-col justify-between h-[100px]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-income"></div>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Receitas</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-text-primary tracking-tight">
                      {formatCurrency(income)}
                    </p>
                  </div>
              </div>
              <div className="w-[55%] pb-1">
                 <MiniBarChart data={incomeChartData} color="var(--income)" height={80} />
              </div>
           </div>
        </div>

        {/* Expense Card */}
        <div className="rounded-2xl bg-card p-6 border border-white/5 relative overflow-hidden group">
          <div className="flex items-end justify-between relative z-10 gap-4">
              <div className="flex flex-col justify-between h-[100px]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-expense"></div>
                    <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Despesas</p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-text-primary tracking-tight">
                      {formatCurrency(expense)}
                    </p>
                  </div>
              </div>
              <div className="w-[55%] pb-1">
                <MiniBarChart data={expenseChartData} color="#FF3B3B" height={80} />
              </div>
          </div>
        </div>
      </div>
    </div>
  )
}