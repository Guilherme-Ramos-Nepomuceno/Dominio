// Lógica pura da caixa de entrada "A classificar" — testável com node:test
// (só `import type`, sem aliases "@/").

import type { Category, TransactionType } from "./types"

export interface InboxGroupLike {
  merchantKey: string | null
  label: string
  suggestion: { categoryId: string } | null
  transactions: Array<{ id: string; type: TransactionType }>
}

// Chave estável de um grupo na tela. O backend agrupa por merchantKey + tipo
// (o mesmo estabelecimento pode ter um grupo de despesa e outro de receita,
// ex: estorno) e, sem merchantKey, cada lançamento vira seu próprio grupo —
// então a chave é tipo + merchantKey, ou o id do (único) lançamento.
export function inboxGroupKey(group: Pick<InboxGroupLike, "merchantKey" | "label" | "transactions">): string {
  const first = group.transactions[0]
  const type = first?.type ?? "unknown"
  if (group.merchantKey) return `${type}:${group.merchantKey}`
  return first ? `tx:${first.id}` : `label:${group.label}`
}

// Tipo do grupo (receita/despesa) — o da maioria das transações; empate ou
// grupo vazio = null (aí o seletor oferece todas as categorias).
export function inboxGroupType(group: Pick<InboxGroupLike, "transactions">): TransactionType | null {
  let income = 0
  let expense = 0
  for (const t of group.transactions) {
    if (t.type === "income") income++
    else expense++
  }
  if (income === expense) return null
  return income > expense ? "income" : "expense"
}

export function selectableCategories(categories: Category[], type: TransactionType | null): Category[] {
  return type ? categories.filter((c) => c.type === type) : categories
}

// A sugestão só vale se apontar para uma categoria existente do MESMO tipo
// do grupo — o backend recusa (400) categoria de despesa em receita e
// vice-versa.
export function isSuggestionValid(group: InboxGroupLike, categories: Category[]): boolean {
  const suggested = group.suggestion?.categoryId
  if (!suggested || group.transactions.length === 0) return false
  const category = categories.find((c) => c.id === suggested)
  if (!category) return false
  const type = inboxGroupType(group)
  return type === null || category.type === type
}

// Seleção inicial de cada grupo: a sugestão da API, se for válida; senão nenhuma.
export function initialSelections(groups: InboxGroupLike[], categories: Category[]): Record<string, string | null> {
  const result: Record<string, string | null> = {}
  for (const g of groups) {
    result[inboxGroupKey(g)] = isSuggestionValid(g, categories) ? g.suggestion!.categoryId : null
  }
  return result
}

// Grupos que "Aceitar todas as sugestões" vai classificar (só sugestões
// válidas e do tipo do grupo).
export function groupsWithSuggestion<T extends InboxGroupLike>(groups: T[], categories: Category[]): T[] {
  return groups.filter((g) => isSuggestionValid(g, categories))
}
