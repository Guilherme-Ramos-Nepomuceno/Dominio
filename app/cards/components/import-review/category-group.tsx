"use client"

import { useState } from "react"
import { CaretDown, Check } from "@phosphor-icons/react"
import type { Category } from "@/lib/types"
import type { ReviewRow } from "./types"
import { CategoryIcon } from "./category-icon"
import { CategoryMoveButton } from "./category-move-button"
import { TransactionRow } from "./transaction-row"
import { Checkbox } from "@/components/ui/checkbox"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface CategoryGroupProps {
  category: Category
  rows: ReviewRow[]
  categories: Category[]
  onRename: (externalId: string, description: string) => void
  onBulkRename: (externalIds: string[], description: string) => void
  onMoveCategory: (externalId: string, categoryId: string) => void
  renderExtra?: (row: ReviewRow) => React.ReactNode
}

export function CategoryGroup({ category, rows, categories, onRename, onBulkRename, onMoveCategory, renderExtra }: CategoryGroupProps) {
  // Fechado por padrão — com o grupo agora aparecendo acima da fila "sem
  // categoria", deixar tudo aberto de cara empurraria o que ainda falta
  // fazer pra baixo da dobra.
  const [expanded, setExpanded] = useState(false)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkName, setBulkName] = useState("")

  const total = rows.reduce((sum, r) => sum + r.amount, 0)

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev)
    setSelected(new Set())
    setBulkName("")
  }

  const toggleSelected = (externalId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(externalId)) next.delete(externalId)
      else next.add(externalId)
      return next
    })
  }

  const applyBulkRename = () => {
    const trimmed = bulkName.trim()
    if (!trimmed || selected.size === 0) return
    onBulkRename([...selected], trimmed)
    toggleSelectMode()
  }

  return (
    <div className="rounded-[1vw] border border-border bg-card/50 overflow-hidden">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setExpanded((v) => !v)
          }
        }}
        className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <CategoryIcon category={category} />
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-foreground truncate">{category.name}</p>
          <p className="text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? "item" : "itens"}</p>
        </div>
        <p className={cn("font-bold tabular-nums text-sm shrink-0", category.type === "expense" ? "text-expense" : "text-income")}>
          {category.type === "expense" ? "-" : "+"}{formatCurrency(total)}
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleSelectMode()
          }}
          className={cn(
            "text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors shrink-0",
            selectMode ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted",
          )}
        >
          {selectMode ? "Cancelar" : "Selecionar"}
        </button>
        <CaretDown size={16} weight="bold" className={cn("text-muted-foreground shrink-0 transition-transform", expanded && "rotate-180")} />
      </div>

      {expanded && (
        <div className="p-3 pt-0 space-y-2">
          {selectMode && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/30">
              <input
                type="text"
                value={bulkName}
                onChange={(e) => setBulkName(e.target.value)}
                placeholder={selected.size > 0 ? `Novo nome pra ${selected.size} ${selected.size === 1 ? "item" : "itens"}` : "Marque os itens abaixo..."}
                disabled={selected.size === 0}
                className="flex-1 min-w-0 px-3 py-1.5 rounded-md bg-card border border-border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
              />
              <button
                type="button"
                onClick={applyBulkRename}
                disabled={selected.size === 0 || !bulkName.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-background text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0"
              >
                <Check size={14} weight="bold" />
                Aplicar
              </button>
            </div>
          )}

          {rows.map((row) => (
            <TransactionRow
              key={row.externalId}
              row={row}
              disabled={!row.include}
              onRename={(description) => onRename(row.externalId, description)}
              leftSlot={
                selectMode ? (
                  <Checkbox checked={selected.has(row.externalId)} onCheckedChange={() => toggleSelected(row.externalId)} />
                ) : undefined
              }
              rightSlot={
                !selectMode ? (
                  <CategoryMoveButton
                    categories={categories}
                    type={category.type}
                    currentCategoryId={category.id}
                    onMove={(newId) => onMoveCategory(row.externalId, newId)}
                  />
                ) : undefined
              }
            >
              {renderExtra?.(row)}
            </TransactionRow>
          ))}
        </div>
      )}
    </div>
  )
}
