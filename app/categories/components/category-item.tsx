"use client"

import { useState } from "react"
import { TrashIcon, Pencil } from "@phosphor-icons/react"
// Adicionamos esta importação para poder buscar o ícone pelo nome (string)
import * as PhosphorIcons from "@phosphor-icons/react"
import type { Category } from "@/lib/types"
import { formatCurrency } from "@/lib/date-utils"
import { transactionCountLabel } from "@/lib/category-utils"
import { formatMoneyWhole, spentProgress } from "@/lib/plan-layout"
import { cn } from "@/lib/utils"

interface CategoryItemProps {
  category: Category
  totalAmount: number
  transactionCount: number
  // Planejado da categoria no plano do mês (null = fora do plano / sem plano).
  planned?: number | null
  // Cor do grupo do plano (ícone e barra).
  color?: string
  icon?: React.ReactNode
  onDelete: (id: string) => void
  onEdit?: (category: Category) => void
  onClick?: (category: Category) => void
}

export function CategoryItem({ category, totalAmount, transactionCount, planned = null, color, onDelete, onEdit, onClick }: CategoryItemProps) {
  // As seções Receitas/Despesas já dizem o tipo; aqui o que vale é gasto × planejado.
  const showPlanned = category.type === "expense" && planned !== null && planned > 0
  const progress = showPlanned ? spentProgress(totalAmount, planned!) : null

  // Lógica para pegar o ícone dinâmico baseado no nome salvo na categoria
  // Se não encontrar, usa o Circle como fallback
  const CategoryIcon = (category.icon && PhosphorIcons[category.icon as keyof typeof PhosphorIcons]) || PhosphorIcons.Circle

  // No mobile a lixeira só aparece arrastando a linha pra esquerda (ganha espaço
  // horizontal) — no desktop ela some e volta a aparecer passando o mouse.
  const [startX, setStartX] = useState<number | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const SWIPE_THRESHOLD = -60

  const onTouchStart = (e: React.TouchEvent) => setStartX(e.targetTouches[0].clientX)
  const onTouchMove = (e: React.TouchEvent) => {
    if (startX === null) return
    const diff = e.targetTouches[0].clientX - startX
    if (diff < 0) setSwipeOffset(Math.max(diff, -80))
  }
  const onTouchEnd = () => {
    setSwipeOffset(swipeOffset < SWIPE_THRESHOLD ? -80 : 0)
    setStartX(null)
  }

  return (
    <div className="relative overflow-hidden group">
      <div className="absolute inset-y-0 right-0 w-20 bg-destructive flex items-center justify-center">
        <button
          onClick={() => onDelete(category.id)}
          className="text-white w-full h-full flex items-center justify-center"
          aria-label={`Excluir ${category.name}`}
        >
          <TrashIcon size={20} weight="bold" />
        </button>
      </div>

      <div
        onClick={() => onClick?.(category)}
        className="relative z-10 flex items-center gap-3 py-3 bg-background cursor-pointer"
        style={{ transform: `translateX(${swipeOffset}px)`, transition: startX === null ? "transform 0.2s ease-out" : "none" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Ícone na cor do grupo do plano */}
        {/* @ts-ignore - componente de ícone dinâmico */}
        <CategoryIcon size={22} weight="duotone" className="shrink-0" style={{ color: color ?? undefined }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-sm font-medium text-foreground truncate">{category.name}</h3>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
            <span>{transactionCountLabel(transactionCount)}</span>
            {showPlanned && (
              <span className={cn("tabular-nums", progress?.over && "text-expense")}>
                {progress?.over ? `${formatMoneyWhole(progress.overAmount)} acima de ${formatMoneyWhole(planned!)}` : `de ${formatMoneyWhole(planned!)} planejado`}
              </span>
            )}
          </div>
          {progress && (
            <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ backgroundColor: "var(--plan-track)" }} aria-hidden>
              <div
                className="h-full rounded-full"
                style={{ width: `${progress.pct}%`, backgroundColor: progress.over ? "var(--expense)" : color || "var(--chart-3)" }}
              />
            </div>
          )}
        </div>

        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(category)
            }}
            className="p-1.5 -mr-1.5 rounded-lg text-muted-foreground/70 hover:text-foreground transition-colors"
            aria-label={`Editar ${category.name}`}
          >
            <Pencil size={16} weight="bold" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete(category.id)
          }}
          className="hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-center w-8 h-8 rounded-full text-destructive hover:bg-destructive/10 transition-all shrink-0"
          title="Excluir categoria"
        >
          <TrashIcon size={16} weight="bold" />
        </button>
      </div>
    </div>
  )
}
