"use client"

import { TrashIcon, TrendUp, TrendDown } from "@phosphor-icons/react"
// Adicionamos esta importação para poder buscar o ícone pelo nome (string)
import * as PhosphorIcons from "@phosphor-icons/react" 
import type { Category } from "@/lib/types"
import { formatCurrency } from "@/lib/date-utils"
import { getSettings } from "@/lib/storage"

interface CategoryItemProps {
  category: Category
  totalAmount: number
  transactionCount: number
  percentage: number
  icon?: React.ReactNode
  onDelete: (id: string) => void
}

export function CategoryItem({ category, totalAmount, transactionCount, percentage, icon, onDelete }: CategoryItemProps) {
  const Icon = category.type === "income" ? TrendUp : TrendDown
  const settings = getSettings()
  const categoryGoals = settings.categoryGoals || []

  const goalData = categoryGoals.find((g: any) => g.categoryId === category.id)
  const goalPercentage = goalData?.percentage || 0

  // Lógica para pegar o ícone dinâmico baseado no nome salvo na categoria
  // Se não encontrar, usa o Circle como fallback
  const CategoryIcon = (category.icon && PhosphorIcons[category.icon as keyof typeof PhosphorIcons]) || PhosphorIcons.Circle

  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors">
      
      {/* Ícone da Categoria (Alterado conforme solicitado) */}
      <div
        className="w-12 h-12 rounded-[1vw] flex items-center justify-center"
        // Adicionamos 'color' aqui para o ícone herdar a cor da categoria
        style={{ backgroundColor: category.color + "20", color: category.color }} 
      >
        {/* Renderiza o ícone dinâmico em vez da bolinha */}
        {/* @ts-ignore - Ignora erro de tipo do componente dinâmico */}
        <CategoryIcon size={24} weight="fill" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-semibold text-foreground">{category.name}</h3>
          <Icon size={14} weight="bold" className={category.type === "income" ? "text-income" : "text-expense"} />
          {goalPercentage > 0 && category.type === "expense" && (
            <>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary/10 text-primary">
                Meta: {goalPercentage}%
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  percentage > 100
                    ? "bg-destructive/10 text-destructive"
                    : percentage > 80
                      ? "bg-yellow-500/10 text-yellow-600"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {percentage.toFixed(0)}% gasto
              </span>
            </>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{transactionCount} transações</p>
      </div>

      <div className="text-right">
        <p className="text-lg font-bold text-foreground">{formatCurrency(totalAmount)}</p>
      </div>

      <button
        onClick={() => onDelete(category.id)}
        className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
      >
        <TrashIcon size={18} weight="bold" />
      </button>
    </div>
  )
}