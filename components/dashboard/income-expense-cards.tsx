"use client"

import { useState, useMemo } from "react"
import { MiniBarChart, type ChartDataPoint } from "./mini-bar-chart"
import { formatCurrency } from "@/lib/date-utils"
import type { PeriodType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { CreditCard, Wallet, Circle } from "@phosphor-icons/react"
import { getTransactions, getCards } from "@/lib/storage"

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
  const [expenseView, setExpenseView] = useState<"all" | "credit">("all")

  const allHistory = getTransactions()
  const cards = getCards()

  // 1. Lógica Inteligente de Processamento (MANTIDA IGUAL)
  const { displayedExpenseValue, processedExpenseTransactions } = useMemo(() => {
    if (expenseView === "all") {
        return {
            displayedExpenseValue: expense,
            processedExpenseTransactions: transactions.filter(t => t.type === 'expense')
        }
    }

    const creditCards = cards.filter(c => c.type === 'credit').map(c => c.id)
    const creditHistory = allHistory.filter(t => creditCards.includes(t.cardId || "") && t.type === 'expense')
    
    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const [currYear, currMonth] = currentMonthStr.split('-').map(Number)

    const projectedTransactions: any[] = []

    creditHistory.forEach(t => {
        if (t.status === 'paid') return

        const tDate = new Date(t.date)
        const tYear = tDate.getFullYear()
        const tMonth = tDate.getMonth() + 1
        const installments = t.installments && t.installments > 1 ? t.installments : 1

        if (installments === 1) {
            const tMonthStr = `${tYear}-${String(tMonth).padStart(2, '0')}`
            if (tMonthStr === currentMonthStr) {
                projectedTransactions.push(t)
            }
        } else {
            const monthDiff = (currYear - tYear) * 12 + (currMonth - tMonth)

            if (monthDiff >= 0 && monthDiff < installments) {
                const adjustedDate = new Date(now.getFullYear(), now.getMonth(), tDate.getDate())
                
                projectedTransactions.push({
                    ...t,
                    amount: t.amount / installments,
                    date: adjustedDate.toISOString(),
                    originalDate: t.date
                })
            }
        }
    })

    const finalFiltered = projectedTransactions.filter(t => {
        const tDate = new Date(t.date)
        
        if (period === 'month') {
            return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear()
        } else {
            const oneWeekAgo = new Date()
            oneWeekAgo.setDate(now.getDate() - 7)
            oneWeekAgo.setHours(0,0,0,0)
            tDate.setHours(0,0,0,0)
            return tDate >= oneWeekAgo && tDate <= now
        }
    })

    const totalPending = finalFiltered.reduce((sum, t) => sum + t.amount, 0)

    return {
        displayedExpenseValue: totalPending,
        processedExpenseTransactions: finalFiltered
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions, expense, expenseView, period]) 


  // 2. Geração dos Gráficos (MANTIDA IGUAL)
  const { incomeChartData, expenseChartData } = useMemo(() => {
    const dataPoints: { dateStr: string, dateObj: Date }[] = []
    const now = new Date()
    
    const formatDateLocalYYYYMMDD = (date: Date) => date.toLocaleDateString('sv-SE');

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

    const processTransactions = (sourceTransactions: any[], type: "income" | "expense"): ChartDataPoint[] => {
      return dataPoints.map(({ dateStr, dateObj }) => {
        const totalValue = sourceTransactions
          .filter((t) => {
              const tDateStr = new Date(t.date).toLocaleDateString('sv-SE')
              return t.type === type && tDateStr === dateStr
          })
          .reduce((sum, t) => sum + t.amount, 0)

        let label = "";
        if (period === 'week') {
           label = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(dateObj).replace('.', '');
        } else {
           label = String(dateObj.getDate()).padStart(2, '0');
        }
        const fullDate = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(dateObj);
        
        return { value: totalValue, label: label, fullDate: fullDate }
      })
    }

    return {
        incomeChartData: processTransactions(transactions, "income"),
        expenseChartData: processTransactions(processedExpenseTransactions, "expense")
    }
  }, [transactions, processedExpenseTransactions, period])

  return (
    <div className="space-y-4 mt-4">
      {/* Seletor Deslizante (Semana/Mês) */}
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
        
        {/* --- CARD RECEITA (ESTRUTURA AJUSTADA) --- */}
        {/* Adicionado 'flex flex-col justify-between' para igualar ao card de despesa */}
        <div className="rounded-2xl bg-card p-6 border border-white/5 relative group flex flex-col justify-between">
           
           {/* NOVO CABEÇALHO (Para alinhar com o cabeçalho do card de despesas) */}
           <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-income"></div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Receitas</p>
              </div>
              {/* Espaço vazio onde estariam os botões no outro card, mantendo a altura */}
              <div className="h-[26px]"></div>
           </div>

           <div className="flex items-end justify-between relative z-10 gap-4">
              {/* Ajustado h-[100px] para h-[60px] e justify-between para justify-end */}
              <div className="flex flex-col justify-end h-[60px]">
                  <div>
                    <p className="text-3xl font-bold text-text-primary tracking-tight">
                      {formatCurrency(income)}
                    </p>
                  </div>
              </div>
              <div className="w-[55%] pb-1">
                 <MiniBarChart data={incomeChartData} color="#A3E635" height={80} />
              </div>
           </div>
        </div>

        {/* --- CARD DESPESA (MANTIDO IGUAL) --- */}
        <div className="rounded-2xl bg-card p-6 border border-white/5 relative group flex flex-col justify-between">
          
          {/* Header com Toggle */}
          <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", expenseView === 'credit' ? "bg-amber-500" : "bg-expense")}></div>
                <p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">
                    {expenseView === 'credit' ? "Fatura Pendente" : "Despesas"}
                </p>
              </div>

              {/* Botão Toggle */}
              <div className="bg-muted/30 p-0.5 rounded-lg flex border border-white/5">
                  <button 
                    onClick={() => setExpenseView("all")}
                    className={cn(
                        "p-1.5 rounded-md transition-all",
                        expenseView === "all" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Geral"
                  >
                    <Wallet size={14} weight="fill" />
                  </button>
                  <button 
                    onClick={() => setExpenseView("credit")}
                    className={cn(
                        "p-1.5 rounded-md transition-all",
                        expenseView === "credit" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                    title="Fatura de Crédito"
                  >
                    <CreditCard size={14} weight="fill" />
                  </button>
              </div>
          </div>

          <div className="flex items-end justify-between relative z-10 gap-4">
              <div className="flex flex-col justify-end h-[60px]">
                  <div>
                    <p className="text-3xl font-bold text-text-primary tracking-tight transition-all key={expenseView}">
                      {formatCurrency(displayedExpenseValue)}
                    </p>
                    {expenseView === 'credit' && (
                        <p className="text-[10px] text-amber-500 flex items-center gap-1 mt-1">
                            <Circle weight="fill" size={6} />
                            Previsto na Fatura
                        </p>
                    )}
                  </div>
              </div>
              <div className="w-[55%] pb-1">
                <MiniBarChart 
                    data={expenseChartData} 
                    color={expenseView === 'credit' ? "#F59E0B" : "#F87171"} 
                    height={80} 
                />
              </div>
          </div>
        </div>

      </div>
    </div>
  )
}