"use client"

import { ExpandableText } from "@/components/ui/expandable-text"
import { useState } from "react"
import type { InboxGroup } from "@/lib/storage"
import type { Category } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"
import { FormSheet, SheetPrimaryButton } from "@/components/ui/form-sheet"
import { CategoryIcon } from "@/app/cards/components/import-review/category-icon"
import { formatCurrency } from "@/lib/date-utils"
import { inboxGroupKey, inboxGroupType } from "@/lib/inbox"
import { cn } from "@/lib/utils"

interface AcceptSuggestionsSheetProps {
  groups: InboxGroup[]
  categories: Category[]
  onApply: (keys: string[]) => void | Promise<void>
  onClose: () => void
}

// Revisão antes de aceitar as sugestões em lote: lista cada grupo com a
// categoria sugerida, todos marcados; a pessoa desmarca o que não quer e só
// o botão aplica.
export function AcceptSuggestionsSheet({ groups, categories, onApply, onClose }: AcceptSuggestionsSheetProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(groups.map(inboxGroupKey)))

  const allSelected = selected.size === groups.length
  const transactionCount = groups.filter((g) => selected.has(inboxGroupKey(g))).reduce((sum, g) => sum + g.count, 0)

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(groups.map(inboxGroupKey)))

  return (
    <FormSheet
      title="Aceitar sugestões"
      onClose={onClose}
      footer={
        <SheetPrimaryButton type="button" onClick={() => onApply([...selected])} disabled={selected.size === 0}>
          {selected.size === 0
            ? "Marque ao menos um grupo"
            : `Aplicar em ${selected.size} ${selected.size === 1 ? "grupo" : "grupos"} (${transactionCount} ${transactionCount === 1 ? "transação" : "transações"})`}
        </SheetPrimaryButton>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Desmarque os grupos que não quer classificar agora.</p>
        <button type="button" onClick={toggleAll} className="shrink-0 text-xs font-medium text-primary hover:underline">
          {allSelected ? "Desmarcar todos" : "Marcar todos"}
        </button>
      </div>

      <ul className="-mt-4 divide-y divide-border">
        {groups.map((group) => {
          const key = inboxGroupKey(group)
          const isSelected = selected.has(key)
          const category = categories.find((c) => c.id === group.suggestion?.categoryId)
          const isIncome = inboxGroupType(group) === "income"
          return (
            <li key={key}>
              <label className={cn("flex cursor-pointer items-center gap-3 py-3 transition-opacity", !isSelected && "opacity-50")}>
                <Checkbox checked={isSelected} onCheckedChange={() => toggle(key)} aria-label={group.label} />
                <div className="flex-1 min-w-0">
                  <ExpandableText className="text-sm font-medium text-foreground">{group.label}</ExpandableText>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                    {category && <CategoryIcon category={category} size="sm" />}
                    <span className="truncate">
                      {category?.name ?? "Sugestão"} · {group.count} {group.count === 1 ? "transação" : "transações"}
                    </span>
                  </p>
                </div>
                <span className={cn("text-sm font-semibold tabular-nums shrink-0", isIncome ? "text-income" : "text-foreground")}>
                  {isIncome ? "+ " : ""}
                  {formatCurrency(group.totalAmount)}
                </span>
              </label>
            </li>
          )
        })}
      </ul>
    </FormSheet>
  )
}
