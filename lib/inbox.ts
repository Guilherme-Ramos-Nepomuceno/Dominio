// Lógica pura da caixa de entrada "A classificar" — testável com node:test
// (só `import type`, sem aliases "@/").

import type { Category, TransactionType } from "./types"

export interface InboxGroupLike {
  merchantKey: string | null
  label: string
  suggestion: { categoryId: string } | null
  transactions: Array<{ id: string; type: TransactionType }>
}

// Chave estável de um grupo na tela. Grupos sem estabelecimento reconhecido
// (merchantKey null) caem no rótulo.
export function inboxGroupKey(group: Pick<InboxGroupLike, "merchantKey" | "label">): string {
  return group.merchantKey ?? `label:${group.label}`
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

// Seleção inicial de cada grupo: a sugestão da API, se ela apontar para uma
// categoria que existe; senão nenhuma.
export function initialSelections(groups: InboxGroupLike[], categories: Category[]): Record<string, string | null> {
  const known = new Set(categories.map((c) => c.id))
  const result: Record<string, string | null> = {}
  for (const g of groups) {
    const suggested = g.suggestion?.categoryId
    result[inboxGroupKey(g)] = suggested && (known.size === 0 || known.has(suggested)) ? suggested : null
  }
  return result
}

// Grupos que "Aceitar todas as sugestões" vai classificar.
export function groupsWithSuggestion<T extends InboxGroupLike>(groups: T[]): T[] {
  return groups.filter((g) => !!g.suggestion?.categoryId && g.transactions.length > 0)
}
