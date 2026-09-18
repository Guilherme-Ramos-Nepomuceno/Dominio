"use client"

import type { Category } from "@/lib/types"
import type { ReviewRow } from "./types"
import { TransactionRow } from "./transaction-row"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface UncategorizedListProps {
  rows: ReviewRow[]
  activeCategoryId: string
  activeCategory?: Category
  onAssign: (externalId: string) => void
  onRename: (externalId: string, description: string) => void
  onToggleInclude: (externalId: string, include: boolean) => void
  renderExtra?: (row: ReviewRow) => React.ReactNode
}

export function UncategorizedList({ rows, activeCategoryId, activeCategory, onAssign, onRename, onToggleInclude, renderExtra }: UncategorizedListProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[1vw] border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Tudo categorizado! Confira os grupos abaixo antes de importar.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        // Categoria mismatch de tipo (ex: categoria de despesa ativa mas essa
        // linha é uma receita) — não faz sentido marcar, então desabilita.
        const canAssign = !!activeCategoryId && row.include && (!activeCategory || activeCategory.type === row.type)
        return (
          <TransactionRow
            key={row.externalId}
            row={row}
            disabled={!row.include}
            onRename={(description) => onRename(row.externalId, description)}
            leftSlot={
              <Checkbox
                checked={false}
                disabled={!canAssign}
                onCheckedChange={() => canAssign && onAssign(row.externalId)}
                title={!activeCategoryId ? "Escolha uma categoria acima primeiro" : undefined}
              />
            }
            rightSlot={
              row.isDuplicate ? (
                <button
                  type="button"
                  onClick={() => onToggleInclude(row.externalId, !row.include)}
                  className={cn(
                    "text-[11px] font-medium px-2 py-1 rounded-md shrink-0 transition-colors",
                    row.include ? "text-muted-foreground hover:bg-muted" : "text-primary bg-primary/10 hover:bg-primary/20",
                  )}
                >
                  {row.include ? "Não importar" : "Incluir mesmo assim"}
                </button>
              ) : undefined
            }
          >
            {renderExtra?.(row)}
          </TransactionRow>
        )
      })}
    </div>
  )
}
