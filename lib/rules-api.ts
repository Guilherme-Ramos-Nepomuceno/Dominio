// Chamadas das regras de categorização e do mapa de categorias da Pluggy.

import { ApiError, fetchApi } from "./api"
import { isReadOnly } from "./storage"
import { mapPluggyCategoryMap, mapRule, type CategoryRule, type PluggyCategoryMapping, type RuleSource } from "./rules"

function assertWritable(): void {
  if (isReadOnly()) {
    throw new Error("Você está vendo os dados de um parceiro (somente leitura) e não pode alterá-los.")
  }
}

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const raw = await fetchApi("/category-rules")
  return (raw || []).map(mapRule)
}

export interface CategoryRuleInput {
  // Um dos dois: a chave já normalizada (vinda de uma sugestão) ou uma
  // descrição/estabelecimento digitado (o backend normaliza).
  merchantKey?: string
  description?: string
  categoryId: string
  minAmount?: number | null
  maxAmount?: number | null
  source?: RuleSource
}

// 409 = já existe regra para esse estabelecimento e faixa; 400 = faixa inválida.
function friendlyRuleError(error: unknown): unknown {
  if (error instanceof ApiError && error.status === 409) {
    return new ApiError(409, "Já existe uma regra para esse estabelecimento nessa faixa de valor.")
  }
  if (error instanceof ApiError && error.status === 400 && /min|max|faixa/i.test(error.message)) {
    return new ApiError(400, "O valor mínimo não pode ser maior que o máximo.")
  }
  return error
}

export async function createCategoryRule(input: CategoryRuleInput): Promise<CategoryRule> {
  assertWritable()
  try {
    return mapRule(await fetchApi("/category-rules", { method: "POST", body: JSON.stringify(input) }))
  } catch (error) {
    throw friendlyRuleError(error)
  }
}

export async function updateCategoryRule(id: string, updates: Partial<CategoryRuleInput>): Promise<CategoryRule> {
  assertWritable()
  try {
    return mapRule(await fetchApi(`/category-rules/${id}`, { method: "PUT", body: JSON.stringify(updates) }))
  } catch (error) {
    throw friendlyRuleError(error)
  }
}

export async function deleteCategoryRule(id: string): Promise<void> {
  assertWritable()
  await fetchApi(`/category-rules/${id}`, { method: "DELETE" })
}

// Regras sugeridas pelo histórico: estabelecimento que a pessoa já
// classificou à mão sempre na mesma categoria. Confirmar = criar a regra.
export interface RuleSuggestion {
  merchantKey: string
  categoryId: string
  label: string
  count: number
}

export async function getRuleSuggestions(): Promise<RuleSuggestion[]> {
  const raw = await fetchApi("/category-rules/suggestions")
  return (Array.isArray(raw) ? raw : []).map((s: any) => ({
    merchantKey: String(s.merchantKey),
    categoryId: String(s.categoryId),
    label: String(s.label ?? s.merchantKey),
    count: Number(s.count) || 0,
  }))
}

export async function dismissRuleSuggestion(merchantKey: string): Promise<void> {
  assertWritable()
  await fetchApi("/category-rules/suggestions/dismiss", { method: "POST", body: JSON.stringify({ merchantKey }) })
}

export async function getPluggyCategoryMap(): Promise<PluggyCategoryMapping[]> {
  return mapPluggyCategoryMap(await fetchApi("/pluggy/category-map"))
}

// Devolve o mapa atualizado; categoryId null volta ao padrão.
export async function setPluggyCategoryMapping(pluggyCategory: string, categoryId: string | null): Promise<PluggyCategoryMapping[]> {
  assertWritable()
  const raw = await fetchApi(`/pluggy/category-map/${encodeURIComponent(pluggyCategory)}`, {
    method: "PUT",
    body: JSON.stringify({ categoryId }),
  })
  return mapPluggyCategoryMap(raw)
}

// Termos genéricos da conta (pix, ted, recebido, banco...): não juntam
// lançamentos em "A classificar" nem viram regra sozinhos.
export interface GenericTerms {
  terms: string[]
  isDefault: boolean
  defaults: string[]
}

function mapGenericTerms(raw: any): GenericTerms {
  const list = (v: any) => (Array.isArray(v) ? v.map(String) : [])
  return { terms: list(raw?.terms), isDefault: !!raw?.isDefault, defaults: list(raw?.defaults) }
}

export async function getGenericTerms(): Promise<GenericTerms> {
  return mapGenericTerms(await fetchApi("/category-rules/generic-terms"))
}

// null = volta para a lista padrão.
export async function setGenericTerms(terms: string[] | null): Promise<GenericTerms> {
  assertWritable()
  return mapGenericTerms(await fetchApi("/category-rules/generic-terms", { method: "PUT", body: JSON.stringify({ terms }) }))
}
