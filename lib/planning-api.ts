// Chamadas do planejamento do mês: grupos de categoria, plano ("a torre") e
// desejos. Tipos e mapeamento em lib/plan.ts.

import { fetchApi } from "./api"
import { isReadOnly } from "./storage"
import {
  mapCategoryGroup,
  mapPlan,
  mapWish,
  type BudgetSource,
  type CategoryGroup,
  type Plan,
  type Wish,
} from "./plan"
import type { PaymentMethod } from "./types"

function assertWritable(): void {
  if (isReadOnly()) {
    throw new Error("Você está vendo os dados de um parceiro (somente leitura) e não pode alterá-los.")
  }
}

// Mudanças no plano/desejos afetam Home (card da semana) e outras telas.
function notifyPlanUpdate(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("plan-update"))
}

// ---------------------------------------------------------------------------
// Grupos de categoria
// ---------------------------------------------------------------------------

export async function getCategoryGroups(): Promise<CategoryGroup[]> {
  const raw = await fetchApi("/category-groups")
  return (raw || []).map(mapCategoryGroup).sort((a: CategoryGroup, b: CategoryGroup) => a.order - b.order)
}

export async function updateCategoryGroup(
  id: string,
  updates: { name?: string; order?: number; countsInWeeklyLimit?: boolean },
): Promise<CategoryGroup> {
  assertWritable()
  const raw = await fetchApi(`/category-groups/${id}`, { method: "PUT", body: JSON.stringify(updates) })
  notifyPlanUpdate()
  return mapCategoryGroup(raw)
}

export async function moveCategoryToGroup(categoryId: string, groupId: string): Promise<void> {
  assertWritable()
  await fetchApi(`/categories/${categoryId}`, { method: "PATCH", body: JSON.stringify({ groupId }) })
  notifyPlanUpdate()
}

// ---------------------------------------------------------------------------
// Plano do mês
// ---------------------------------------------------------------------------

export async function getPlan(year: number, month: number): Promise<Plan> {
  return mapPlan(await fetchApi(`/plans/${year}/${month}`))
}

export interface PlanUpdate {
  budgetAmount?: number | null
  budgetSource?: BudgetSource
  weeklyLimitEnabled?: boolean
  categories?: Array<{ categoryId: string; plannedVariable: number }>
}

export async function updatePlan(year: number, month: number, updates: PlanUpdate): Promise<Plan> {
  assertWritable()
  const raw = await fetchApi(`/plans/${year}/${month}`, { method: "PUT", body: JSON.stringify(updates) })
  notifyPlanUpdate()
  return mapPlan(raw)
}

export async function confirmPlan(year: number, month: number): Promise<Plan> {
  assertWritable()
  const raw = await fetchApi(`/plans/${year}/${month}/confirm`, { method: "POST" })
  notifyPlanUpdate()
  return mapPlan(raw)
}

// ---------------------------------------------------------------------------
// Desejos
// ---------------------------------------------------------------------------

export async function getWishes(year: number, month: number): Promise<Wish[]> {
  const raw = await fetchApi(`/wishes?year=${year}&month=${month}`)
  return (raw || []).map(mapWish)
}

export interface WishInput {
  name: string
  estimatedAmount: number
  categoryId?: string | null
  link?: string | null
  notes?: string | null
  year?: number
  month?: number
  // Na conta pessoal, grava o desejo na conta do casal.
  isCasal?: boolean
}

export async function createWish(input: WishInput): Promise<Wish> {
  assertWritable()
  const raw = await fetchApi("/wishes", { method: "POST", body: JSON.stringify(input) })
  notifyPlanUpdate()
  return mapWish(raw)
}

export async function updateWish(id: string, updates: Partial<WishInput>): Promise<Wish> {
  assertWritable()
  const raw = await fetchApi(`/wishes/${id}`, { method: "PUT", body: JSON.stringify(updates) })
  notifyPlanUpdate()
  return mapWish(raw)
}

export async function deleteWish(id: string): Promise<void> {
  assertWritable()
  await fetchApi(`/wishes/${id}`, { method: "DELETE" })
  notifyPlanUpdate()
}

export async function reorderWishes(ids: string[]): Promise<void> {
  assertWritable()
  await fetchApi("/wishes/reorder", { method: "PATCH", body: JSON.stringify({ ids }) })
  notifyPlanUpdate()
}

export interface WishCandidate {
  id: string
  description: string
  amount: number
  date: string
  cardId: string | null
}

export async function getWishCandidates(id: string): Promise<WishCandidate[]> {
  const raw = await fetchApi(`/wishes/${id}/candidates`)
  return (raw || []).map((t: any) => ({
    id: String(t.id),
    description: String(t.description ?? ""),
    amount: Number(t.amount),
    date: String(t.date ?? ""),
    cardId: t.cardId ?? null,
  }))
}

export type BuyWishInput =
  | { transactionId: string }
  | {
      transaction: {
        amount: number
        date: string
        cardId?: string
        paymentMethod?: PaymentMethod
        description?: string
      }
    }

export async function buyWish(id: string, input: BuyWishInput): Promise<Wish> {
  assertWritable()
  const body =
    "transactionId" in input
      ? input
      : {
          transaction: {
            ...input.transaction,
            date: new Date(input.transaction.date).toISOString(),
            paymentMethod: input.transaction.paymentMethod?.toUpperCase(),
          },
        }
  const raw = await fetchApi(`/wishes/${id}/buy`, { method: "POST", body: JSON.stringify(body) })
  notifyPlanUpdate()
  // Criar a transação da compra muda saldo/listas.
  if (typeof window !== "undefined") window.dispatchEvent(new Event("storage-update"))
  return mapWish(raw?.wish ?? raw)
}

