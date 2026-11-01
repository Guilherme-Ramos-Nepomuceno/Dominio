// Regras de categorização e categorização automática: tipos do contrato,
// mapeamento e textos de exibição. Lógica pura — testável com node:test.

import type { CategorizedBy } from "./types"

export type RuleSource = "LEARNED" | "MANUAL"

export interface CategoryRule {
  id: string
  merchantKey: string
  categoryId: string
  minAmount: number | null
  maxAmount: number | null
  source: RuleSource
  hits: number
}

// Sugestão do backend ao categorizar: "sempre colocar <label> em <categoria>?"
export interface RuleSuggestion {
  merchantKey: string
  categoryId: string
  label: string
}

// Já existe regra para esse estabelecimento apontando para outra categoria.
export interface RuleConflict {
  ruleId: string
  merchantKey: string
  categoryId: string
}

export interface RuleFeedback {
  // Categoria que a pessoa acabou de escolher.
  categoryId: string | null
  suggestion: RuleSuggestion | null
  conflict: RuleConflict | null
}

export interface PluggyCategoryMapping {
  pluggyCategory: string
  categoryId: string | null
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function mapRule(r: any): CategoryRule {
  return {
    id: String(r.id),
    merchantKey: String(r.merchantKey ?? ""),
    categoryId: String(r.categoryId ?? ""),
    minAmount: numOrNull(r.minAmount),
    maxAmount: numOrNull(r.maxAmount),
    source: r.source === "MANUAL" ? "MANUAL" : "LEARNED",
    hits: Number(r.hits ?? 0) || 0,
  }
}

export function mapRuleSuggestion(s: any): RuleSuggestion | null {
  if (!s || !s.merchantKey || !s.categoryId) return null
  return { merchantKey: String(s.merchantKey), categoryId: String(s.categoryId), label: String(s.label ?? s.merchantKey) }
}

export function mapRuleConflict(c: any): RuleConflict | null {
  if (!c || !c.ruleId) return null
  return { ruleId: String(c.ruleId), merchantKey: String(c.merchantKey ?? ""), categoryId: String(c.categoryId ?? "") }
}

export function mapPluggyCategoryMap(rows: any): PluggyCategoryMapping[] {
  return (Array.isArray(rows) ? rows : [])
    .map((r: any) => ({ pluggyCategory: String(r.pluggyCategory ?? ""), categoryId: r.categoryId ?? null }))
    .filter((r) => r.pluggyCategory)
    .sort((a, b) => a.pluggyCategory.localeCompare(b.pluggyCategory, "pt-BR"))
}

// Origens automáticas (tudo menos a escolha manual).
const AUTO_LABEL: Record<Exclude<CategorizedBy, "MANUAL">, string> = {
  RULE: "por uma regra sua",
  HISTORY: "pelo seu histórico",
  MERCHANT: "pelo estabelecimento",
  PLUGGY: "pela categoria do banco",
  DICTIONARY: "por palavras da descrição",
}

export function isAutoCategorized(t: { categoryId: string | null; categorizedBy?: CategorizedBy | null }): boolean {
  return !!t.categoryId && !!t.categorizedBy && t.categorizedBy !== "MANUAL"
}

export function autoCategorizedLabel(by: CategorizedBy | null | undefined): string {
  if (!by || by === "MANUAL") return ""
  return `Categoria definida automaticamente ${AUTO_LABEL[by] ?? ""}`.trim()
}

// "qualquer valor" / "até R$ 50" / "a partir de R$ 10" / "R$ 10 a R$ 50"
export function formatAmountRange(min: number | null, max: number | null, format: (v: number) => string): string {
  if (min === null && max === null) return "qualquer valor"
  if (min === null) return `até ${format(max!)}`
  if (max === null) return `a partir de ${format(min)}`
  return `${format(min)} a ${format(max)}`
}

export function ruleHitsLabel(hits: number): string {
  if (hits <= 0) return "ainda não usada"
  if (hits === 1) return "usada 1 vez"
  return `usada ${hits} vezes`
}

export interface RuleFormInput {
  description: string
  categoryId: string
  minAmount: number | null
  maxAmount: number | null
}

export function validateRuleForm(input: RuleFormInput, requireDescription: boolean): string | null {
  if (requireDescription && !input.description.trim()) return "Informe a descrição ou o estabelecimento."
  if (!input.categoryId) return "Escolha a categoria."
  if (input.minAmount !== null && input.maxAmount !== null && input.minAmount > input.maxAmount) {
    return "O valor mínimo não pode ser maior que o máximo."
  }
  return null
}
