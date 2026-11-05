// Layout da tela Planejar mês: cor fixa de cada grupo, segmentos da barra do
// mês (o orçamento inteiro dividido entre os grupos), fila dos desejos que
// cabem na sobra e os rótulos do herói/cabeçalho. Lógica pura — sem aliases
// "@/" e só com import de "./plan.ts" — para rodar no test runner do Node.

import { effectiveBudget, type CategoryGroup, type GroupKind, type Plan, type PlanStatus, type PlanWish } from "./plan.ts"

// ---------------------------------------------------------------------------
// Dinheiro sem centavos (visão geral). Centavos só onde se edita.
// ---------------------------------------------------------------------------

const wholeBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatMoneyWhole(value: number): string {
  // `|| 0` evita "-R$ 0" para valores entre -0,5 e 0.
  return wholeBRL.format(Math.round(value) || 0)
}

// "Faltam R$ X": arredonda para cima, para nunca dizer "faltam R$ 0".
export function formatShortfall(value: number): string {
  return wholeBRL.format(Math.ceil(Math.abs(value) - 0.004) || 0)
}

// ---------------------------------------------------------------------------
// Cor por grupo — uma cor fixa por `kind`, a mesma na barra, na legenda, na
// lista e no detalhe do grupo. Os valores (claro/escuro) ficam em
// app/globals.css (--plan-*), validados com o validador da skill dataviz.
// ---------------------------------------------------------------------------

export const GROUP_KIND_COLOR: Record<GroupKind, string> = {
  ESSENTIALS: "var(--plan-essentials)",
  LIFESTYLE: "var(--plan-lifestyle)",
  FUTURE: "var(--plan-future)",
  WISHES: "var(--plan-wishes)",
}

export const UNCATEGORIZED_COLOR = "var(--plan-uncategorized)"

export function groupColor(kind: GroupKind | string | null | undefined): string {
  return (kind && GROUP_KIND_COLOR[kind as GroupKind]) || UNCATEGORIZED_COLOR
}

// ---------------------------------------------------------------------------
// Barra do mês
// ---------------------------------------------------------------------------

export type MonthBarSegmentType = "group" | "uncategorized" | "free"

export interface MonthBarSegment {
  key: string
  type: MonthBarSegmentType
  // Só nos segmentos de grupo.
  groupId: string | null
  kind: GroupKind | null
  label: string
  // null = "Livre" (é o próprio fundo da barra).
  color: string | null
  // Quanto do orçamento o segmento ocupa (planejado).
  amount: number
  spent: number
  // Posição e largura na escala da barra (0–100).
  startPct: number
  widthPct: number
  // Quanto do próprio segmento já foi gasto (0–100).
  spentPct: number
  overspent: boolean
}

export interface MonthBar {
  budget: number
  // Grupos + sem categoria + desejos.
  allocated: number
  free: number
  // Quanto a soma passa do orçamento (0 se não passa).
  over: number
  // Escala da barra: o maior entre orçamento e alocado.
  scale: number
  // Onde termina o orçamento na barra (100 se não passa).
  budgetPct: number
  segments: MonthBarSegment[]
}

const round2 = (v: number) => Math.round(v * 100) / 100
const positive = (v: number) => (Number.isFinite(v) && v > 0 ? v : 0)

// Ordem da barra (e da lista "Para onde vai"): os grupos do orçamento na
// ordem deles, o gasto sem categoria (também consome a margem), os desejos e,
// por fim, o que fica livre. Desejos + Livre = a sobra do herói.
export function monthBar(
  plan: Pick<Plan, "groups" | "uncategorized" | "wishesPlanned" | "budgetAmount" | "suggestedBudget">,
): MonthBar {
  const budget = positive(effectiveBudget(plan))
  const groups = plan.groups.slice().sort((a, b) => a.order - b.order)
  const wishesGroup = groups.find((g) => g.kind === "WISHES") ?? null

  type Draft = Omit<MonthBarSegment, "startPct" | "widthPct" | "spentPct" | "overspent">
  const drafts: Draft[] = []
  for (const g of groups) {
    if (g.kind === "WISHES") continue
    drafts.push({
      key: g.id,
      type: "group",
      groupId: g.id,
      kind: g.kind,
      label: g.name,
      color: groupColor(g.kind),
      amount: positive(g.planned),
      spent: positive(g.spent),
    })
  }
  const uncategorized = positive(plan.uncategorized.spent)
  if (uncategorized > 0) {
    drafts.push({
      key: "uncategorized",
      type: "uncategorized",
      groupId: null,
      kind: null,
      label: "Sem categoria",
      color: UNCATEGORIZED_COLOR,
      amount: uncategorized,
      spent: uncategorized,
    })
  }
  const wishes = positive(plan.wishesPlanned)
  if (wishesGroup || wishes > 0) {
    drafts.push({
      key: wishesGroup?.id ?? "wishes",
      type: "group",
      groupId: wishesGroup?.id ?? null,
      kind: "WISHES",
      label: wishesGroup?.name ?? "Desejos",
      color: groupColor("WISHES"),
      amount: wishes,
      spent: positive(wishesGroup?.spent ?? 0),
    })
  }

  const allocated = round2(drafts.reduce((s, d) => s + d.amount, 0))
  const free = round2(Math.max(0, budget - allocated))
  const over = round2(Math.max(0, allocated - budget))
  if (free > 0) {
    drafts.push({ key: "free", type: "free", groupId: null, kind: null, label: "Livre", color: null, amount: free, spent: 0 })
  }
  const scale = Math.max(budget, allocated)

  let cursor = 0
  const segments: MonthBarSegment[] = drafts
    .filter((d) => d.amount > 0)
    .map((d) => {
      const widthPct = scale > 0 ? (d.amount / scale) * 100 : 0
      const seg: MonthBarSegment = {
        ...d,
        startPct: cursor,
        widthPct,
        spentPct: d.type === "free" ? 0 : Math.min(100, (d.spent / d.amount) * 100),
        overspent: d.type === "group" && d.spent > d.amount + 0.004,
      }
      cursor += widthPct
      return seg
    })

  return {
    budget,
    allocated,
    free,
    over,
    scale,
    budgetPct: scale > 0 && over > 0 ? (budget / scale) * 100 : 100,
    segments,
  }
}

// Resumo em texto da barra (aria-label / leitores de tela).
export function monthBarSummary(bar: MonthBar): string {
  if (bar.segments.length === 0) return `Orçamento de ${formatMoneyWhole(bar.budget)}, ainda sem nada planejado.`
  const parts = bar.segments.map((s) => `${s.label} ${formatMoneyWhole(s.amount)}`)
  const head = `Orçamento de ${formatMoneyWhole(bar.budget)}: ${parts.join(", ")}.`
  return bar.over > 0 ? `${head} O plano passa ${formatShortfall(bar.over)} do orçamento.` : head
}

// Planejado = soma dos grupos (com desejos), o mesmo "Planejado" do Fechamento.
// O sem categoria ocupa a barra, mas não foi planejado.
export function monthBarPlanned(bar: MonthBar): number {
  return round2(bar.segments.filter((s) => s.type === "group").reduce((sum, s) => sum + s.amount, 0))
}

// Legenda do gasto embaixo da barra: o tom forte de cada segmento somado
// (o sem categoria é todo gasto: ele só existe porque já saiu).
export function monthBarSpentCaption(bar: MonthBar): string {
  const spent = bar.segments.filter((s) => s.type !== "free").reduce((sum, s) => sum + s.spent, 0)
  return `${formatMoneyWhole(spent)} já gasto de ${formatMoneyWhole(monthBarPlanned(bar))} planejado`
}

// O gasto real só faz sentido na barra com o plano confirmado (ou fechado) e
// depois que o período começou — antes disso tudo seria "zero gasto".
export function showsSpending(status: PlanStatus, periodStart: string, todayISO: string): boolean {
  if (status !== "CONFIRMED" && status !== "CLOSED") return false
  return !periodStart || todayISO >= periodStart.slice(0, 10)
}

// Barrinha gasto/planejado de um grupo ou categoria.
export function spentProgress(spent: number, planned: number): { pct: number; over: boolean; overAmount: number } {
  const s = positive(spent)
  const p = positive(planned)
  const over = s > p + 0.004
  return {
    pct: p > 0 ? Math.min(100, (s / p) * 100) : s > 0 ? 100 : 0,
    over,
    overAmount: over ? round2(s - p) : 0,
  }
}

// ---------------------------------------------------------------------------
// Fila dos desejos: a barra fina que se enche com o que cabe na sobra
// ---------------------------------------------------------------------------

export interface WishQueueSlice {
  id: string
  name: string
  amount: number
  bought: boolean
  startPct: number
  widthPct: number
}

export interface WishQueue {
  // O que há para desejos (margem livre do mês).
  available: number
  // Comprados + abertos que cabem.
  used: number
  slices: WishQueueSlice[]
  fittingCount: number
  openCount: number
}

// Mesma ordem da alocação (lib/plan.ts → allocateWishes): os comprados saem
// da margem primeiro; depois os abertos que cabem, na ordem da prioridade.
export function wishQueue(plan: Pick<Plan, "freeMargin" | "wishes">): WishQueue {
  const sorted = plan.wishes.slice().sort((a, b) => a.priority - b.priority)
  const bought = sorted.filter((w) => w.status === "BOUGHT")
  const open = sorted.filter((w) => w.status === "OPEN")
  const fitting = open.filter((w) => w.fits)
  const items = [
    ...bought.map((w) => ({ id: w.id, name: w.name, amount: positive(w.actualAmount ?? w.estimatedAmount), bought: true })),
    ...fitting.map((w) => ({ id: w.id, name: w.name, amount: positive(w.estimatedAmount), bought: false })),
  ].filter((i) => i.amount > 0)
  const available = round2(plan.freeMargin)
  const used = round2(items.reduce((s, i) => s + i.amount, 0))
  const scale = Math.max(positive(available), used)
  let cursor = 0
  const slices = items.map((i) => {
    const widthPct = scale > 0 ? (i.amount / scale) * 100 : 0
    const slice = { ...i, startPct: cursor, widthPct }
    cursor += widthPct
    return slice
  })
  return { available, used, slices, fittingCount: fitting.length, openCount: open.length }
}

export type WishFitTone = "fits" | "fresh" | "missing"

// "✓ cabe", "Agora cabe!" (acabou de passar a caber) ou "faltam R$ X".
export function wishFitLabel(
  wish: Pick<PlanWish, "fits" | "missing" | "estimatedAmount">,
  highlighted = false,
): { tone: WishFitTone; text: string } {
  if (wish.fits) return highlighted ? { tone: "fresh", text: "Agora cabe!" } : { tone: "fits", text: "cabe" }
  const missing = wish.missing > 0 ? wish.missing : wish.estimatedAmount
  return { tone: "missing", text: `faltam ${formatShortfall(missing)}` }
}

// ---------------------------------------------------------------------------
// Herói, cabeçalho e guia
// ---------------------------------------------------------------------------

export interface PlanHeadline {
  label: string
  value: number
  negative: boolean
  // "Faltam R$ X para fechar o plano" (null quando não falta).
  shortfallText: string | null
}

// Antes de confirmar, a resposta principal é quanto sobra para os desejos (a
// margem livre). Confirmado/fechado, é a sobra prevista depois dos desejos.
export function planHeadline(plan: Pick<Plan, "status" | "freeMargin" | "leftover">): PlanHeadline {
  const settled = plan.status === "CONFIRMED" || plan.status === "CLOSED"
  const value = settled ? plan.leftover : plan.freeMargin
  const negative = value < -0.004
  return {
    label: settled ? "Sobra prevista" : "Sobra para seus desejos",
    value,
    negative,
    shortfallText: negative ? `Faltam ${formatShortfall(value)} para fechar o plano` : null,
  }
}

// "de R$ 6.000 de renda prevista" / "de R$ 5.000 de orçamento".
export function budgetCaption(plan: Pick<Plan, "budgetAmount" | "budgetSource" | "suggestedBudget">): string {
  const budget = effectiveBudget(plan)
  if (plan.budgetSource === "INCOME") {
    return budget > 0 ? `de ${formatMoneyWhole(budget)} de renda prevista` : "Sem renda prevista — defina o orçamento do mês"
  }
  return `de ${formatMoneyWhole(budget)} de orçamento`
}

const MONTH_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]
const MONTH_ABBR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

// "Novembro" (com o ano só quando não é o ano corrente).
export function planMonthTitle(year: number, month: number, currentYear: number): string {
  const name = MONTH_FULL[month - 1] ?? ""
  return year === currentYear ? name : `${name} de ${year}`
}

// "1 a 30 nov" / "5 nov a 4 dez" — datas "YYYY-MM-DD" do período do plano.
export function planPeriodLabel(periodStart: string, periodEnd: string): string {
  const parse = (iso: string) => {
    const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
    return { y, m, d }
  }
  if (!periodStart || !periodEnd) return ""
  const s = parse(periodStart)
  const e = parse(periodEnd)
  if (!s.d || !e.d) return ""
  if (s.y === e.y && s.m === e.m) return `${s.d} a ${e.d} ${MONTH_ABBR[e.m - 1]}`
  return `${s.d} ${MONTH_ABBR[s.m - 1]} a ${e.d} ${MONTH_ABBR[e.m - 1]}`
}

// Linha guia leve no topo (no lugar do antigo aviso grande).
export function planGuide(status: PlanStatus): string | null {
  switch (status) {
    case "NONE":
      return "Proposta montada com seus gastos recentes. Confira o orçamento, ajuste os grupos e escolha os desejos."
    case "DRAFT":
      return "Confira o orçamento, ajuste os grupos e escolha os desejos."
    case "CLOSED":
      return "Mês fechado — o plano fica só para consulta."
    default:
      return null
  }
}

export function canConfirmPlan(status: PlanStatus, editable: boolean): boolean {
  return editable && (status === "NONE" || status === "DRAFT")
}

// Planejado de cada categoria no plano (comprometido + variável), para a tela
// Categorias. Sem plano salvo, nada.
export function plannedByCategory(plan: Pick<Plan, "status" | "groups">): Record<string, number> {
  if (plan.status === "NONE") return {}
  const out: Record<string, number> = {}
  for (const g of plan.groups) {
    for (const c of g.categories) out[c.categoryId] = round2(positive(c.committed) + positive(c.plannedVariable))
  }
  return out
}

// Identificação de um pedaço da barra do mês (balão e linha ao tocar na Home):
// o nome, a frase do que ele é e para onde levar.
export function segmentDetail(segment: MonthBarSegment, showSpending: boolean): { text: string; href: string | null } {
  if (segment.type === "free") return { text: `${formatMoneyWhole(segment.amount)} ainda sem destino`, href: null }
  if (segment.type === "uncategorized") return { text: `${formatMoneyWhole(segment.amount)} gastos sem categoria`, href: "/inbox" }
  if (segment.kind === "WISHES") return { text: `${formatMoneyWhole(segment.amount)} para os desejos que cabem`, href: "/plan#desejos" }
  const href = segment.groupId ? `/plan/${segment.groupId}` : "/plan"
  if (!showSpending) return { text: `${formatMoneyWhole(segment.amount)} planejado`, href }
  if (segment.overspent) {
    return { text: `${formatMoneyWhole(segment.spent)} gastos de ${formatMoneyWhole(segment.amount)} · ${formatShortfall(segment.spent - segment.amount)} acima`, href }
  }
  return { text: `${formatMoneyWhole(segment.spent)} gastos de ${formatMoneyWhole(segment.amount)} planejado`, href }
}

// Grupo do plano de uma categoria (Essenciais, Estilo de vida...), ou nada
// (sem categoria, receita, categoria fora dos grupos).
export function groupOfCategory(
  groups: Pick<CategoryGroup, "id" | "name" | "kind" | "order" | "categoryIds">[],
  categoryId: string | null | undefined,
): Pick<CategoryGroup, "id" | "name" | "kind" | "order" | "categoryIds"> | undefined {
  if (!categoryId) return undefined
  return groups.find((g) => g.categoryIds.includes(categoryId))
}

// Cor do ícone de uma transação nas listas: a do grupo do plano (a mesma da
// barra do mês). Receita fica na cor de entrada; sem grupo, cinza.
export function transactionIconColor(
  groups: Pick<CategoryGroup, "id" | "name" | "kind" | "order" | "categoryIds">[],
  categoryId: string | null | undefined,
  type: "income" | "expense" | string | undefined,
): string {
  if (type === "income") return "var(--income)"
  const group = groupOfCategory(groups, categoryId)
  return group ? groupColor(group.kind) : UNCATEGORIZED_COLOR
}
