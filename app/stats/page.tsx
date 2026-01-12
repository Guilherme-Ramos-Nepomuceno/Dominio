"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { StackedBarChart } from "@/components/charts/stacked-bar-chart"
import { PeriodSelector } from "@/components/dashboard/period-selector"
import { useMonthData } from "@/hooks/use-transactions"
import { getCurrentMonth, formatMonth, formatCurrency } from "@/lib/date-utils"
import { setSettings, getSettings, getCategories } from "@/lib/storage"
import { cn } from "@/lib/utils"
import { CategoryAlert } from "../types/category"
import * as PhosphorIcons from "@phosphor-icons/react" // Importando todos para mapear dinamicamente

export default function StatsPage() {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const monthData = useMonthData(selectedMonth)
  const settings = getSettings()
  const categories = getCategories()

  const handleThresholdChange = (newThreshold: number) => {
    setSettings({ spendingGoal: newThreshold })
    window.location.reload()
  }

  // Definições de datas para comparação (usando hora local para evitar erro de fuso)
  const todayObj = new Date()
  const yesterdayObj = new Date()
  yesterdayObj.setDate(yesterdayObj.getDate() - 1)

  // Função auxiliar para pegar YYYY-MM-DD local
  const getLocalDateKey = (date: Date) => {
    return date.toLocaleDateString('sv-SE') // Retorna YYYY-MM-DD no fuso local
  }

  const todayKey = getLocalDateKey(todayObj)
  const yesterdayKey = getLocalDateKey(yesterdayObj)

  // --- NOVA LÓGICA DE AGRUPAMENTO (CORRIGIDA) ---
  const groupedTransactions = monthData.transactions.reduce((groups, transaction) => {
    // Cria o objeto Date (o navegador converte UTC para Local automaticamente aqui)
    const tDate = new Date(transaction.date)
    
    // Extrai a chave YYYY-MM-DD baseada no horário LOCAL
    const dateKey = getLocalDateKey(tDate)
    
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(transaction)
    return groups
  }, {} as Record<string, typeof monthData.transactions>)

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => {
    // Ordena string YYYY-MM-DD corretamente
    return b.localeCompare(a)
  })

  // --- COMPONENTE DE ITEM DE TRANSAÇÃO ---
  const TransactionItem = ({ transaction }: { transaction: any }) => {
    const dateObj = new Date(transaction.date)
    
    // Formata a hora
    const timeString = dateObj.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    })

    // Busca a categoria para pegar o ícone e cor
    const category = categories.find(c => c.id === transaction.categoryId)
    
    // Lógica para renderizar o ícone dinamicamente
    // Assumindo que category.icon é uma string com o nome do ícone (ex: "ForkKnife")
    const IconComponent = category?.icon && (PhosphorIcons as any)[category.icon] 
      ? (PhosphorIcons as any)[category.icon] 
      : PhosphorIcons.Question; // Ícone fallback se não encontrar

    return (
      <div className="flex items-center justify-between p-4 rounded-[1vw] bg-card border border-border/50 hover:border-border transition-colors group">
        <div className="flex items-center gap-4 flex-1">
          {/* Ícone da Categoria */}
          <div 
            className="w-10 h-10 rounded-[0.8rem] flex items-center justify-center bg-background border border-border group-hover:bg-muted transition-colors"
            style={{ color: category?.color || "#888" }}
          >
            <IconComponent size={20} weight="duotone" />
          </div>

          <div>
            <p className="font-semibold text-foreground">{transaction.description}</p>
            <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded-md">
                    {category?.name || "Geral"}
                </span>
                <p className="text-xs text-muted-foreground">
                    {timeString}
                </p>
            </div>
          </div>
        </div>

        {/* Valor (Cor Text-Foreground) */}
        <p className="text-lg font-bold text-foreground tabular-nums">
          {transaction.type === "expense" ? "-" : "+"}
          {formatCurrency(transaction.amount)}
        </p>
      </div>
    )
  }

  // --- CÁLCULOS DE ALERTAS ---
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
    .filter(Boolean) as CategoryAlert[]

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
          currentMonth={selectedMonth}
          onThresholdChange={handleThresholdChange}
          onMonthChange={setSelectedMonth}
        />
      </div>

      <div className="space-y-8 pb-10">
        {sortedDates.length > 0 ? (
          sortedDates.map((date) => {
            const isToday = date === todayKey
            const isYesterday = date === yesterdayKey
            const transactionsForDate = groupedTransactions[date]

            let groupTitle = ""
            
            // Reconstruir a data para exibição correta (adiciona hora meio-dia para evitar virada de dia no display)
            const dateObjForTitle = new Date(date + "T12:00:00")

            if (isToday) {
              groupTitle = "Hoje"
            } else if (isYesterday) {
              groupTitle = "Ontem"
            } else {
              const dayAndMonth = dateObjForTitle.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })
              groupTitle = dayAndMonth.charAt(0).toUpperCase() + dayAndMonth.slice(1)
              const weekDay = dateObjForTitle.toLocaleDateString("pt-BR", { weekday: "long" })
              groupTitle += ` • ${weekDay}`
            }

            return (
              <div key={date}>
                <h2 className="text-lg font-bold text-foreground mb-3 capitalize px-1 flex items-center gap-2">
                    {groupTitle}
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {transactionsForDate.length}
                    </span>
                </h2>
                <div className="space-y-3">
                  {transactionsForDate.map((t) => (
                    <TransactionItem key={t.id} transaction={t} />
                  ))}
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-2xl bg-card p-8 text-center border border-border/50">
            <p className="text-muted-foreground">Nenhuma transação neste período</p>
          </div>
        )}
      </div>
    </AppLayout>
  )
}