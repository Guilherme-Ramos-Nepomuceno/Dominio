"use client"

import { useMemo, useState } from "react"
import type { Category, TransactionType } from "@/lib/types"
import type { ReviewRow } from "./types"
import { UncategorizedList } from "./uncategorized-list"
import { CategoryPicker } from "./category-picker"
import { CategoryGroup } from "./category-group"
import { TransactionRow } from "./transaction-row"

interface ReviewStepProps {
  rows: ReviewRow[]
  categories: Category[]
  updateRow: (externalId: string, updates: Partial<ReviewRow>) => void
  includedCount: number
  totalCount: number
  isSaving: boolean
  canConfirm: boolean
  confirmLabel: string
  /** Ausente quando não há um passo anterior pra voltar (ex: fila de sincronização bancária, que não nasce de um upload) — nesse caso o botão "Voltar" nem aparece. */
  onBack?: () => void
  onConfirm: () => void
  /** Blocos de negócio (conciliação de pendência / transferência entre contas) — o dialog decide o conteúdo, esse componente só decide onde encaixar. */
  renderPendingBlock: (row: ReviewRow) => React.ReactNode
  renderTransferBlock: (row: ReviewRow) => React.ReactNode
  /** Ausente = a busca de categoria não oferece "criar categoria nova". */
  onCreateCategory?: (type: TransactionType, name: string, icon: string) => Promise<Category>
}

export function ReviewStep({
  rows,
  categories,
  updateRow,
  includedCount,
  totalCount,
  isSaving,
  canConfirm,
  confirmLabel,
  onBack,
  onConfirm,
  renderPendingBlock,
  renderTransferBlock,
  onCreateCategory,
}: ReviewStepProps) {
  const [activeCategoryId, setActiveCategoryId] = useState("")

  // Uma pendência confirmada ("sim, é essa mesma") não precisa de categoria —
  // fica de fora da fila principal, numa listinha própria mais abaixo.
  // Memoizados — com centenas de linhas (ex: sincronização bancária), refazer
  // esses filtros/agrupamentos a cada render (inclusive os disparados por
  // outra parte da tela, tipo digitar num campo) é caro sem necessidade.
  const settled = useMemo(() => rows.filter((r) => r.settleDecision === "yes"), [rows])
  const uncategorized = useMemo(() => rows.filter((r) => !r.categoryId && r.settleDecision !== "yes"), [rows])

  // Ranqueia os chips pela frequência no lote inteiro (não só na fila) — a
  // maioria dos itens com sugestão já nasce categorizada, então olhar só a
  // fila deixaria a lista de chips quase sempre vazia.
  const suggestionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const row of rows) {
      const id = row.categoryId || row.suggestedCategoryId
      if (!id) continue
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
    return counts
  }, [rows])

  const activeCategory = categories.find((c) => c.id === activeCategoryId)

  // Categoria ativa de despesa só mostra despesa, de receita só mostra
  // receita — marcar itens fora do tipo nem fazia sentido (categoria não
  // bate), então em vez de só desabilitar o checkbox, some da lista.
  const visibleUncategorized = useMemo(
    () => (activeCategory ? uncategorized.filter((r) => r.type === activeCategory.type) : uncategorized),
    [uncategorized, activeCategory],
  )
  const uncategorizedEmptyMessage =
    activeCategory && uncategorized.length > 0 && visibleUncategorized.length === 0
      ? `Nenhuma ${activeCategory.type === "income" ? "receita" : "despesa"} sem categoria — troque a categoria ativa acima pra ver as demais.`
      : undefined

  // Itera na ordem de `categories` (estável) em vez da ordem de inserção das
  // linhas — senão os grupos ficariam trocando de lugar a cada item marcado.
  const groups = useMemo(
    () =>
      categories
        .map((category) => ({ category, rows: rows.filter((r) => r.categoryId === category.id) }))
        .filter((g) => g.rows.length > 0),
    [categories, rows],
  )

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        {includedCount} de {totalCount} transações marcadas pra importar — {uncategorized.length === 0 ? "tudo categorizado" : `${uncategorized.length} ainda sem categoria`}.
      </p>

      {uncategorized.length > 0 && (
        <CategoryPicker
          categories={categories}
          suggestionCounts={suggestionCounts}
          relevantTypes={new Set(uncategorized.map((r) => r.type))}
          activeCategoryId={activeCategoryId}
          onSelect={setActiveCategoryId}
          onCreateCategory={onCreateCategory}
        />
      )}

      {groups.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Categorizadas</h3>
          <div className="space-y-2">
            {groups.map(({ category, rows: groupRows }) => (
              <CategoryGroup
                key={category.id}
                category={category}
                rows={groupRows}
                categories={categories}
                onRename={(externalId, description) => updateRow(externalId, { description })}
                onBulkRename={(externalIds, description) => externalIds.forEach((id) => updateRow(id, { description }))}
                onMoveCategory={(externalId, categoryId) => updateRow(externalId, { categoryId })}
                renderExtra={(row) => (
                  <>
                    {renderPendingBlock(row)}
                    {renderTransferBlock(row)}
                  </>
                )}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Sem categoria</h3>
        <UncategorizedList
          rows={visibleUncategorized}
          activeCategoryId={activeCategoryId}
          activeCategory={activeCategory}
          onAssign={(externalId) => updateRow(externalId, { categoryId: activeCategoryId })}
          onRename={(externalId, description) => updateRow(externalId, { description })}
          onToggleInclude={(externalId, include) => updateRow(externalId, { include })}
          renderExtra={renderPendingBlock}
          emptyMessage={uncategorizedEmptyMessage}
        />
      </div>

      {settled.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">Pendências que serão baixadas</h3>
          <div className="space-y-2">
            {settled.map((row) => (
              <TransactionRow
                key={row.externalId}
                row={row}
                disabled={!row.include}
                onRename={(description) => updateRow(row.externalId, { description })}
              >
                {renderPendingBlock(row)}
              </TransactionRow>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-[1vw] border border-border text-foreground font-semibold hover:bg-muted transition-colors disabled:opacity-50"
          >
            Voltar
          </button>
        )}
        <button
          type="button"
          onClick={onConfirm}
          disabled={!canConfirm}
          className="flex-1 py-3 px-4 rounded-[1vw] bg-primary text-background font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
