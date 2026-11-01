// Planejamento do mês ("a torre"): tipos do contrato com o backend, mapeamento
// das respostas (valores Decimal podem chegar como string) e cálculos de
// exibição — barra de cada grupo, estados dos desejos e o recálculo otimista
// ao editar um valor. Lógica pura: só `import type`, sem aliases "@/", para
// rodar no test runner do Node.

export type PlanStatus = "NONE" | "DRAFT" | "CONFIRMED" | "CLOSED"
export type GroupKind = "ESSENTIALS" | "LIFESTYLE" | "WISHES" | "FUTURE"
export type BudgetSource = "INCOME" | "MANUAL"
export type CommittedKind = "RECURRING" | "INSTALLMENT" | "PENDING"
export type WishStatus = "OPEN" | "BOUGHT" | "POSTPONED" | "GOAL" | "REMOVED"

export interface CategoryGroup {
  id: string
  name: string
  kind: GroupKind
  order: number
  countsInWeeklyLimit: boolean
  categoryIds: string[]
}

export interface CommittedItem {
  transactionId: string
  description: string
  amount: number
  date: string
  kind: CommittedKind
}

export interface PlanCategory {
  categoryId: string
  name: string
  color: string
  icon: string | null
  committed: number
  committedItems: CommittedItem[]
  plannedVariable: number
  // Valor sugerido antes da pessoa editar (null = nunca editado).
  originalPlannedVariable: number | null
  spent: number
  spentVariable: number
  average3m: number
}

export interface PlanGroup {
  id: string
  name: string
  kind: GroupKind
  order: number
  countsInWeeklyLimit: boolean
  committed: number
  plannedVariable: number
  planned: number
  spent: number
  categories: PlanCategory[]
}

export interface Wish {
  id: string
  userId: string
  year: number
  month: number
  name: string
  estimatedAmount: number
  actualAmount: number | null
  categoryId: string | null
  priority: number
  status: WishStatus
  postponedCount: number
  link: string | null
  notes: string | null
  transactionId: string | null
  goalId: string | null
}

export interface PlanWish extends Wish {
  fits: boolean
  missing: number
}

export interface Plan {
  year: number
  month: number
  periodStart: string
  periodEnd: string
  status: PlanStatus
  budgetAmount: number | null
  budgetSource: BudgetSource
  suggestedBudget: number
  weeklyLimitEnabled: boolean
  groups: PlanGroup[]
  uncategorized: { spent: number }
  freeMargin: number
  wishes: PlanWish[]
  wishesPlanned: number
  leftover: number
}

// ---------------------------------------------------------------------------
// Mapeamento da API
// ---------------------------------------------------------------------------

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : num(v))

export function mapCategoryGroup(g: any): CategoryGroup {
  return {
    id: String(g.id),
    name: String(g.name ?? ""),
    kind: g.kind as GroupKind,
    order: num(g.order),
    countsInWeeklyLimit: !!g.countsInWeeklyLimit,
    categoryIds: Array.isArray(g.categoryIds) ? g.categoryIds.map(String) : [],
  }
}

export function mapWish(w: any): Wish {
  return {
    id: String(w.id),
    userId: String(w.userId ?? ""),
    year: num(w.year),
    month: num(w.month),
    name: String(w.name ?? ""),
    estimatedAmount: num(w.estimatedAmount),
    actualAmount: numOrNull(w.actualAmount),
    categoryId: w.categoryId ?? null,
    priority: num(w.priority),
    status: (w.status ?? "OPEN") as WishStatus,
    postponedCount: num(w.postponedCount),
    link: w.link ?? null,
    notes: w.notes ?? null,
    transactionId: w.transactionId ?? null,
    goalId: w.goalId ?? null,
  }
}

function mapPlanWish(w: any): PlanWish {
  return { ...mapWish(w), fits: !!w.fits, missing: num(w.missing) }
}

function mapPlanCategory(c: any): PlanCategory {
  return {
    categoryId: String(c.categoryId),
    name: String(c.name ?? ""),
    color: c.color ?? "#9ca3af",
    icon: c.icon ?? null,
    committed: num(c.committed),
    committedItems: (c.committedItems ?? []).map((i: any) => ({
      transactionId: String(i.transactionId),
      description: String(i.description ?? ""),
      amount: num(i.amount),
      date: String(i.date ?? ""),
      kind: (i.kind ?? "PENDING") as CommittedKind,
    })),
    plannedVariable: num(c.plannedVariable),
    originalPlannedVariable: numOrNull(c.originalPlannedVariable),
    spent: num(c.spent),
    spentVariable: num(c.spentVariable),
    average3m: num(c.average3m),
  }
}

export function mapPlan(p: any): Plan {
  return {
    year: num(p.year),
    month: num(p.month),
    periodStart: String(p.periodStart ?? ""),
    periodEnd: String(p.periodEnd ?? ""),
    status: (p.status ?? "NONE") as PlanStatus,
    budgetAmount: numOrNull(p.budgetAmount),
    budgetSource: (p.budgetSource ?? "INCOME") as BudgetSource,
    suggestedBudget: num(p.suggestedBudget),
    weeklyLimitEnabled: !!p.weeklyLimitEnabled,
    groups: (p.groups ?? [])
      .map((g: any) => ({
        id: String(g.id),
        name: String(g.name ?? ""),
        kind: g.kind as GroupKind,
        order: num(g.order),
        countsInWeeklyLimit: !!g.countsInWeeklyLimit,
        committed: num(g.committed),
        plannedVariable: num(g.plannedVariable),
        planned: num(g.planned),
        spent: num(g.spent),
        categories: (g.categories ?? []).map(mapPlanCategory),
      }))
      .sort((a: PlanGroup, b: PlanGroup) => a.order - b.order),
    uncategorized: { spent: num(p.uncategorized?.spent) },
    freeMargin: num(p.freeMargin),
    wishes: sortByPriority((p.wishes ?? []).map(mapPlanWish)),
    wishesPlanned: num(p.wishesPlanned),
    leftover: num(p.leftover),
  }
}

// ---------------------------------------------------------------------------
// Exibição
// ---------------------------------------------------------------------------

export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  NONE: "Rascunho sugerido",
  DRAFT: "Rascunho",
  CONFIRMED: "Confirmado",
  CLOSED: "Fechado",
}

export function isPlanEditable(status: PlanStatus): boolean {
  return status !== "CLOSED"
}

// Orçamento efetivo: o definido, ou a sugestão (renda prevista) enquanto não há.
export function effectiveBudget(plan: Pick<Plan, "budgetAmount" | "suggestedBudget">): number {
  return plan.budgetAmount ?? plan.suggestedBudget
}

export interface BarSegments {
  // Percentuais (0–100) da largura total da barra.
  committedPct: number
  variablePct: number
  spentPct: number
  overspent: boolean
  // Quanto passou do planejado (0 se não passou).
  overAmount: number
}

// Barra planejado × gasto de um grupo/categoria: o fundo é o planejado
// (comprometido + variável, em tons diferentes) e o gasto é a linha por cima.
// A escala é o maior entre planejado e gasto, para o estouro aparecer.
export function barSegments(item: { committed: number; plannedVariable: number; spent: number }): BarSegments {
  const planned = Math.max(0, item.committed) + Math.max(0, item.plannedVariable)
  const spent = Math.max(0, item.spent)
  const scale = Math.max(planned, spent)
  if (scale <= 0) return { committedPct: 0, variablePct: 0, spentPct: 0, overspent: false, overAmount: 0 }
  const pct = (v: number) => Math.min(100, Math.max(0, (v / scale) * 100))
  return {
    committedPct: pct(Math.max(0, item.committed)),
    variablePct: pct(Math.max(0, item.plannedVariable)),
    spentPct: pct(spent),
    overspent: spent > planned + 0.004,
    overAmount: Math.max(0, round2(spent - planned)),
  }
}

export type WishFitState = "fits" | "partial" | "none"

// "cabe este mês" / "faltam R$ X" (cabe em parte) / "ainda não cabe" (nada sobra).
export function wishFitState(w: Pick<PlanWish, "fits" | "missing" | "estimatedAmount">): WishFitState {
  if (w.fits) return "fits"
  if (w.missing > 0 && w.missing < w.estimatedAmount) return "partial"
  return "none"
}

export function sortByPriority<T extends { priority: number }>(items: T[]): T[] {
  return items.slice().sort((a, b) => a.priority - b.priority)
}

// Ids de desejos que não cabiam e passaram a caber (ex.: depois de reduzir uma categoria).
export function newlyFittingWishIds(prev: Array<Pick<PlanWish, "id" | "fits">>, next: Array<Pick<PlanWish, "id" | "fits">>): string[] {
  const before = new Map(prev.map((w) => [w.id, w.fits]))
  return next.filter((w) => w.fits && before.get(w.id) === false).map((w) => w.id)
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= items.length) return items.slice()
  const target = Math.max(0, Math.min(items.length - 1, to))
  const copy = items.slice()
  const [moved] = copy.splice(from, 1)
  copy.splice(target, 0, moved)
  return copy
}

function round2(v: number): number {
  return Math.round(v * 100) / 100
}

// Distribui a margem livre pelos desejos, na ordem de prioridade (mesma
// regra do backend, src/utils/plan-calculator.ts): os já comprados saem da
// margem primeiro (e contam como "cabem"); os abertos vão acumulando — cabe
// enquanto o acumulado couber; o primeiro que não cabe fica faltando a
// diferença e, a partir dele, os seguintes "ainda não cabem" (falta o valor
// inteiro). Usado no recálculo otimista — a resposta do servidor prevalece.
export function allocateWishes<T extends Wish>(
  wishes: T[],
  freeMargin: number,
): { wishes: Array<T & { fits: boolean; missing: number }>; wishesPlanned: number } {
  const sorted = sortByPriority(wishes)
  const boughtTotal = sorted
    .filter((w) => w.status === "BOUGHT")
    .reduce((s, w) => s + (w.actualAmount ?? w.estimatedAmount), 0)
  const available = round2(freeMargin - boughtTotal)
  let accumulated = 0
  let blocked = false
  let openPlanned = 0
  const result = sorted.map((w) => {
    if (w.status === "BOUGHT") return { ...w, fits: true, missing: 0 }
    if (w.status !== "OPEN") return { ...w, fits: false, missing: 0 }
    if (blocked) return { ...w, fits: false, missing: round2(w.estimatedAmount) }
    accumulated += w.estimatedAmount
    if (round2(accumulated) <= available) {
      openPlanned += w.estimatedAmount
      return { ...w, fits: true, missing: 0 }
    }
    blocked = true
    return { ...w, fits: false, missing: round2(accumulated - available) }
  })
  return { wishes: result, wishesPlanned: round2(openPlanned + boughtTotal) }
}

// Recalcula totais do plano a partir das categorias (planejado variável),
// orçamento e desejos — usado no otimista enquanto o PUT não volta. Mesma
// conta do backend: margem livre = orçamento − planejado dos grupos (fora o
// grupo Desejos, cujo planejado são os próprios desejos).
export function recomputePlan(plan: Plan): Plan {
  const baseGroups = plan.groups.map((g) => {
    if (g.kind === "WISHES") return g
    const plannedVariable = round2(g.categories.reduce((s, c) => s + c.plannedVariable, 0))
    const committed = round2(g.categories.reduce((s, c) => s + c.committed, 0))
    return { ...g, plannedVariable, committed, planned: round2(committed + plannedVariable) }
  })
  const plannedTotal = baseGroups.filter((g) => g.kind !== "WISHES").reduce((s, g) => s + g.planned, 0)
  const freeMargin = round2(effectiveBudget(plan) - plannedTotal)
  const { wishes, wishesPlanned } = allocateWishes(plan.wishes, freeMargin)
  const groups = baseGroups.map((g) => (g.kind === "WISHES" ? { ...g, plannedVariable: wishesPlanned, planned: wishesPlanned } : g))
  return { ...plan, groups, freeMargin, wishes, wishesPlanned, leftover: round2(freeMargin - wishesPlanned) }
}

export function withPlannedVariable(plan: Plan, categoryId: string, value: number): Plan {
  return recomputePlan({
    ...plan,
    groups: plan.groups.map((g) => ({
      ...g,
      categories: g.categories.map((c) => (c.categoryId === categoryId ? { ...c, plannedVariable: Math.max(0, value) } : c)),
    })),
  })
}

export function withBudget(plan: Plan, budgetAmount: number | null, budgetSource: BudgetSource): Plan {
  return recomputePlan({ ...plan, budgetAmount, budgetSource })
}

export function withWishOrder(plan: Plan, orderedIds: string[]): Plan {
  const position = new Map(orderedIds.map((id, i) => [id, i]))
  return recomputePlan({
    ...plan,
    wishes: plan.wishes.map((w) => ({ ...w, priority: position.get(w.id) ?? orderedIds.length + w.priority })),
  })
}

export function planTotals(plan: Pick<Plan, "groups" | "uncategorized">) {
  const planned = round2(plan.groups.reduce((s, g) => s + g.planned, 0))
  const committed = round2(plan.groups.reduce((s, g) => s + g.committed, 0))
  const spent = round2(plan.groups.reduce((s, g) => s + g.spent, 0) + plan.uncategorized.spent)
  return { planned, committed, spent }
}

// Valor digitado ("1.234,56", "1234.5", "R$ 80") → número; null se inválido.
export function parseMoneyInput(raw: string): number | null {
  const cleaned = raw.replace(/[^\d,.-]/g, "").trim()
  if (!cleaned) return null
  let normalized = cleaned
  if (cleaned.includes(",")) normalized = cleaned.replace(/\./g, "").replace(",", ".")
  // "1.234" / "12.500" sem vírgula: ponto como separador de milhar (pt-BR).
  else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) normalized = cleaned.replace(/\./g, "")
  const n = Number(normalized)
  if (!Number.isFinite(n) || n < 0) return null
  return round2(n)
}

export function formatMoneyInput(value: number | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
