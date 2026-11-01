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
  // DEFAULT = mapeamento padrão do app; LEARNED = escolhido/aprendido da pessoa.
  source: "LEARNED" | "DEFAULT"
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
    .map((r: any) => ({
      pluggyCategory: String(r.pluggyCategory ?? ""),
      categoryId: r.categoryId ?? null,
      source: (r.source === "LEARNED" ? "LEARNED" : "DEFAULT") as PluggyCategoryMapping["source"],
    }))
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

// ---------------------------------------------------------------------------
// Agregação de avisos de regra
// ---------------------------------------------------------------------------

export interface PendingRuleConflict extends RuleConflict {
  // Categoria que a pessoa acabou de escolher (para onde a regra mudaria).
  newCategoryId: string
  label: string
}

export interface AggregatedRuleFeedback {
  suggestions: RuleSuggestion[]
  conflicts: PendingRuleConflict[]
}

// Junta os avisos gerados por uma mesma ação (ex.: "Aceitar todas as
// sugestões" categoriza vários grupos seguidos): uma sugestão por
// estabelecimento e um conflito por regra (vale o mais recente); se o mesmo
// estabelecimento tem conflito, a sugestão dele sai (a pergunta é atualizar).
export function aggregateRuleFeedback(items: RuleFeedback[]): AggregatedRuleFeedback {
  const suggestions = new Map<string, RuleSuggestion>()
  const conflicts = new Map<string, PendingRuleConflict>()
  for (const item of items) {
    if (item.conflict && item.categoryId) {
      // Escolheu a mesma categoria da regra: não há o que atualizar.
      if (item.conflict.categoryId === item.categoryId) continue
      conflicts.set(item.conflict.ruleId, {
        ...item.conflict,
        newCategoryId: item.categoryId,
        label: item.suggestion?.label ?? item.conflict.merchantKey,
      })
    } else if (item.suggestion) {
      suggestions.set(item.suggestion.merchantKey, item.suggestion)
    }
  }
  const conflictKeys = new Set(Array.from(conflicts.values()).map((c) => c.merchantKey))
  return {
    suggestions: Array.from(suggestions.values()).filter((s) => !conflictKeys.has(s.merchantKey)),
    conflicts: Array.from(conflicts.values()),
  }
}

export type RuleFeedbackPrompt =
  | { kind: "none" }
  | { kind: "single-suggestion"; suggestion: RuleSuggestion }
  | { kind: "single-conflict"; conflict: PendingRuleConflict }
  | { kind: "batch"; title: string; feedback: AggregatedRuleFeedback }

// Um único aviso por ação: pergunta direta com 1 item; com 2+, um resumo que
// abre a lista para escolher.
export function ruleFeedbackPrompt(agg: AggregatedRuleFeedback): RuleFeedbackPrompt {
  const s = agg.suggestions.length
  const c = agg.conflicts.length
  if (s + c === 0) return { kind: "none" }
  if (s === 1 && c === 0) return { kind: "single-suggestion", suggestion: agg.suggestions[0] }
  if (c === 1 && s === 0) return { kind: "single-conflict", conflict: agg.conflicts[0] }
  const title =
    c === 0
      ? `Criar regras para ${s} comerciantes?`
      : s === 0
        ? `Atualizar ${c} regras?`
        : `Revisar regras de ${s + c} comerciantes?`
  return { kind: "batch", title, feedback: agg }
}
