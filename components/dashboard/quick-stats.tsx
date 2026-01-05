"use client"

import { Percent, TrendUp, Calendar } from "@phosphor-icons/react"
import { getSettings } from "@/lib/storage"
import { formatCurrency } from "@/lib/date-utils"

interface QuickStatsProps {
  totalExpense: number
  transactionCount: number
}

export function QuickStats({ totalExpense, transactionCount }: QuickStatsProps) {
  const settings = getSettings()
  const spendingPercentage = (totalExpense / settings.spendingGoal) * 100
  const avgPerDay = transactionCount > 0 ? totalExpense / 30 : 0

  const stats = [
    {
      icon: Percent,
      label: "Meta de Gastos",
      value: `${spendingPercentage.toFixed(1)}%`,
      subtitle: `de ${formatCurrency(settings.spendingGoal)}`,
      color: spendingPercentage > 100 ? "text-expense" : "text-income",
    },
    {
      icon: TrendUp,
      label: "Média Diária",
      value: formatCurrency(avgPerDay),
      subtitle: "últimos 30 dias",
      color: "text-primary",
    },
    {
      icon: Calendar,
      label: "Transações",
      value: transactionCount.toString(),
      subtitle: "neste mês",
      color: "text-muted-foreground",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="rounded-[20px] bg-card p-5 border border-border/50 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-muted/50">
              <stat.icon size={18} weight="bold" className="text-muted-foreground" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
          </div>

          <p className={`text-2xl font-bold mb-1 ${stat.color}`}>{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
        </div>
      ))}
    </div>
  )
}
