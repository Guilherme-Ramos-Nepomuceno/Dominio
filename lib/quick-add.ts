// Lógica pura do registro rápido (teclado numérico, chips de categoria e
// passagem para o formulário completo). Sem dependências de React/DOM nem de
// aliases "@/" — só `import type` — para poder ser testada com o test runner
// nativo do Node (`npm test`).

import type { Category, TransactionType } from "./types"

// Valor digitado no teclado é guardado em centavos (inteiro), como uma
// calculadora de caixa: cada dígito empurra os anteriores para a esquerda.
export const MAX_AMOUNT_DIGITS = 9 // até R$ 9.999.999,99

export type KeypadKey = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "00" | "backspace" | "clear"

export function applyKeypadKey(cents: number, key: KeypadKey): number {
  if (key === "clear") return 0
  if (key === "backspace") return Math.floor(cents / 10)
  const next = `${cents === 0 ? "" : String(cents)}${key}`.replace(/^0+/, "")
  if (next.length > MAX_AMOUNT_DIGITS) return cents
  return next ? Number.parseInt(next, 10) : 0
}

export function centsToAmount(cents: number): number {
  return Math.round(cents) / 100
}

export function amountToCents(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0
  return Math.round(amount * 100)
}

// "R$ 1.234,56" — formatação manual (não depende do ICU do ambiente, que no
// Node/servidor pode usar um espaço diferente do navegador).
export function formatCentsBRL(cents: number): string {
  const safe = Math.max(0, Math.round(cents))
  const reais = Math.floor(safe / 100)
  const centavos = String(safe % 100).padStart(2, "0")
  const reaisStr = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return `R$ ${reaisStr},${centavos}`
}

export interface ChipSuggestion {
  categoryId: string
}

// Até `max` chips: sugestão (pela descrição) primeiro, depois as mais
// frequentes, sem repetir e só categorias que existem e são do tipo certo.
// A categoria já escolhida sempre aparece (mesmo que não esteja entre as
// sugeridas) para dar para desmarcar com um toque. Categorias de
// transferência (excludedFromTotals) ficam de fora — não fazem sentido num
// gasto do dia a dia.
export function buildCategoryChips(
  categories: Category[],
  type: TransactionType,
  suggestion: ChipSuggestion | null,
  frequent: string[],
  selectedCategoryId: string | null,
  max = 4,
): Category[] {
  const byId = new Map(categories.filter((c) => c.type === type && !c.excludedFromTotals).map((c) => [c.id, c]))
  const ids: string[] = []
  const push = (id: string | null | undefined) => {
    if (!id || ids.includes(id) || !byId.has(id)) return
    ids.push(id)
  }
  push(selectedCategoryId)
  push(suggestion?.categoryId)
  frequent.forEach(push)
  // Completa com as primeiras categorias do tipo quando ainda não há
  // histórico (conta nova), para nunca abrir com zero chips.
  if (ids.length < max) byId.forEach((_c, id) => push(id))
  return ids.slice(0, max).map((id) => byId.get(id)!)
}

// Toque no chip: seleciona; tocar de novo no mesmo chip desmarca.
export function toggleChip(current: string | null, tapped: string): string | null {
  return current === tapped ? null : tapped
}

export interface QuickAddDraft {
  type: TransactionType
  cents: number
  description: string
  cardId: string | null
  date: string // YYYY-MM-DD
  categoryId: string | null
}

// Descrição padrão quando o registro rápido é salvo sem descrição — o
// backend exige uma, e o nome da categoria (se houver) é o melhor palpite.
export function defaultDescription(type: TransactionType, categoryName?: string | null): string {
  if (categoryName) return categoryName
  return type === "income" ? "Receita" : "Despesa"
}

// Querystring para "Mais opções" — abre /new já preenchido.
export function buildMoreOptionsQuery(draft: QuickAddDraft): string {
  const params = new URLSearchParams()
  params.set("type", draft.type)
  if (draft.cents > 0) params.set("amount", String(centsToAmount(draft.cents)))
  if (draft.description.trim()) params.set("description", draft.description.trim())
  if (draft.cardId) params.set("cardId", draft.cardId)
  if (draft.date) params.set("date", draft.date)
  if (draft.categoryId) params.set("categoryId", draft.categoryId)
  return params.toString()
}

export interface NewTransactionPrefill {
  type?: TransactionType
  amount?: number
  description?: string
  cardId?: string
  date?: string
  categoryId?: string
}

// Lê o que veio do registro rápido na URL de /new. Ignora valores inválidos.
export function parseNewTransactionPrefill(params: { get(name: string): string | null }): NewTransactionPrefill {
  const result: NewTransactionPrefill = {}
  const type = params.get("type")
  if (type === "income" || type === "expense") result.type = type
  const amount = Number.parseFloat(params.get("amount") ?? "")
  if (Number.isFinite(amount) && amount > 0) result.amount = Math.round(amount * 100) / 100
  const description = params.get("description")
  if (description) result.description = description.slice(0, 200)
  const cardId = params.get("cardId")
  if (cardId) result.cardId = cardId
  const date = params.get("date")
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) result.date = date
  const categoryId = params.get("categoryId")
  if (categoryId) result.categoryId = categoryId
  return result
}

export function todayLocalISODate(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}
