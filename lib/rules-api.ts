// Chamadas das regras de categorização e do mapa de categorias da Pluggy.

import { fetchApi } from "./api"
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

export async function createCategoryRule(input: CategoryRuleInput): Promise<CategoryRule> {
  assertWritable()
  return mapRule(await fetchApi("/category-rules", { method: "POST", body: JSON.stringify(input) }))
}

export async function updateCategoryRule(id: string, updates: Partial<CategoryRuleInput>): Promise<CategoryRule> {
  assertWritable()
  return mapRule(await fetchApi(`/category-rules/${id}`, { method: "PUT", body: JSON.stringify(updates) }))
}

export async function deleteCategoryRule(id: string): Promise<void> {
  assertWritable()
  await fetchApi(`/category-rules/${id}`, { method: "DELETE" })
}

export async function getPluggyCategoryMap(): Promise<PluggyCategoryMapping[]> {
  return mapPluggyCategoryMap(await fetchApi("/pluggy/category-map"))
}

export async function setPluggyCategoryMapping(pluggyCategory: string, categoryId: string | null): Promise<void> {
  assertWritable()
  await fetchApi(`/pluggy/category-map/${encodeURIComponent(pluggyCategory)}`, {
    method: "PUT",
    body: JSON.stringify({ categoryId }),
  })
}
