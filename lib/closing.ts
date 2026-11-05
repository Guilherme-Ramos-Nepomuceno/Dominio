// Fechamento do plano do mês: resumo planejado × real, decisão de cada desejo
// em aberto e destino da sobra. Tipos, mapeamento e regras de exibição —
// lógica pura, testável com node:test.

import { mapWish, type Wish } from "./plan.ts"

export type WishDecision = "NEXT_MONTH" | "GOAL" | "REMOVE"
export type LeftoverDestination = "GOAL" | "SAVINGS"

export interface ClosingSummary {
  budgetAmount: number
  plannedTotal: number
  spentTotal: number
  adherencePct: number
  leftover: number
}

export interface ClosingData {
  summary: ClosingSummary
  // Desejos ainda em aberto que precisam de uma decisão.
  openWishes: Wish[]
  status: "NONE" | "DRAFT" | "CONFIRMED" | "CLOSED" | null
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function mapClosingSummary(s: any): ClosingSummary {
  return {
    budgetAmount: num(s?.budgetAmount),
    plannedTotal: num(s?.plannedTotal),
    spentTotal: num(s?.spentTotal),
    adherencePct: num(s?.adherencePct),
    leftover: num(s?.leftover),
  }
}

// Aceita { summary, wishes } ou o resumo "achatado" com os desejos ao lado.
export function mapClosingData(raw: any): ClosingData {
  const summary = mapClosingSummary(raw?.summary ?? raw)
  const wishesRaw = raw?.openWishes ?? raw?.pendingWishes ?? raw?.wishes ?? []
  const openWishes = (Array.isArray(wishesRaw) ? wishesRaw : []).map(mapWish).filter((w: Wish) => w.status === "OPEN")
  const status = raw?.status ?? raw?.plan?.status ?? null
  return { summary, openWishes, status }
}

export const DECISION_LABEL: Record<WishDecision, string> = {
  NEXT_MONTH: "Próximo mês",
  GOAL: "Virar objetivo",
  REMOVE: "Remover",
}

export function defaultDecisions(wishes: Array<Pick<Wish, "id">>): Record<string, WishDecision> {
  return Object.fromEntries(wishes.map((w) => [w.id, "NEXT_MONTH" as WishDecision]))
}

// Aviso ao adiar de novo um desejo que já foi adiado 2+ vezes.
export function postponeWarning(wish: Pick<Wish, "postponedCount">): string | null {
  if (wish.postponedCount < 2) return null
  return `Já foi adiado ${wish.postponedCount} vezes. Vale virar objetivo?`
}

export interface LeftoverChoice {
  destination: LeftoverDestination | null
  id: string | null
  amount: number | null
}

export function validateLeftover(choice: LeftoverChoice, leftover: number): string | null {
  if (!choice.destination) return null
  if (!choice.id) return choice.destination === "GOAL" ? "Escolha o objetivo." : "Escolha a reserva."
  if (choice.amount === null || choice.amount <= 0) return "Informe o valor."
  if (choice.amount > leftover + 0.004) return "O valor passa da sobra do mês."
  return null
}

export function buildCloseBody(decisions: Record<string, WishDecision>, choice: LeftoverChoice) {
  const body: {
    wishDecisions: Array<{ wishId: string; decision: WishDecision }>
    leftover?: { destination: LeftoverDestination; id: string; amount: number }
  } = {
    wishDecisions: Object.entries(decisions).map(([wishId, decision]) => ({ wishId, decision })),
  }
  if (choice.destination && choice.id && choice.amount && choice.amount > 0) {
    body.leftover = { destination: choice.destination, id: choice.id, amount: choice.amount }
  }
  return body
}

export function adherenceTone(pct: number): "ok" | "warning" | "over" {
  if (pct <= 100) return "ok"
  if (pct <= 110) return "warning"
  return "over"
}

const SHORT_MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

// Mês ainda correndo (hoje ≤ fim do período): dá para fechar, mas a sobra
// ainda vai mudar. `endLabel` = "30 nov".
export function closingTiming(periodEnd: string, todayISO: string): { inProgress: boolean; endLabel: string } {
  const end = periodEnd.slice(0, 10)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(end)
  if (!m) return { inProgress: false, endLabel: "" }
  return { inProgress: todayISO <= end, endLabel: `${Number(m[3])} ${SHORT_MONTHS[Number(m[2]) - 1]}` }
}

// ---------------------------------------------------------------------------
// Resultado do mês (nível 1 da tela) e como terminou cada grupo
// ---------------------------------------------------------------------------

const wholeBRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 })
const money = (v: number) => wholeBRL.format(Math.round(v) || 0)

export interface ClosingResult {
  // "Outubro terminou com" / "Novembro, até agora"
  label: string
  value: number
  // "de sobra" / "acima do orçamento"
  suffix: string
  tone: "good" | "over"
  // "R$ 4.205 gastos de R$ 4.800 planejado (88%)"
  line: string
}

// Mês encerrado: o destaque é a sobra (orçamento − gasto, o dinheiro que
// ficou). Mês em andamento: essa conta ainda não diz nada (quase todo o
// orçamento "sobra" no dia 3), então o destaque é o gasto até agora × o
// planejado. Sem plano, a linha não fala de planejado.
export function closingResult(summary: ClosingSummary, monthName: string, opts: { inProgress: boolean; hasPlan: boolean }): ClosingResult {
  const name = monthName.charAt(0).toUpperCase() + monthName.slice(1)
  const pct = summary.plannedTotal > 0 ? Math.round((summary.spentTotal / summary.plannedTotal) * 100) : 0
  if (opts.inProgress) {
    const over = opts.hasPlan && summary.spentTotal > summary.plannedTotal + 0.004
    return {
      label: `${name}, até agora`,
      value: summary.spentTotal,
      suffix: opts.hasPlan ? `gastos de ${money(summary.plannedTotal)} planejado` : "gastos",
      tone: over ? "over" : "good",
      line: opts.hasPlan ? `${pct}% do planejado do mês` : `de ${money(summary.budgetAmount)} de receitas`,
    }
  }
  const over = summary.leftover < -0.004
  return {
    label: `${name} terminou com`,
    value: Math.abs(summary.leftover),
    suffix: over ? "acima do orçamento" : "de sobra",
    tone: over ? "over" : "good",
    line: opts.hasPlan
      ? `${money(summary.spentTotal)} gastos de ${money(summary.plannedTotal)} planejado (${pct}%)`
      : `${money(summary.spentTotal)} gastos de ${money(summary.budgetAmount)} de receitas`,
  }
}

export interface GroupOutcome {
  id: string
  name: string
  color: string | null
  planned: number
  spent: number
  over: boolean
  text: string
}

// Uma linha por grupo planejado: dentro (quanto sobrou — ou, com o mês em
// andamento, quanto ainda está disponível) ou acima (quanto passou).
export function groupOutcomes(
  groups: Array<{ id: string; name: string; color: string | null; planned: number; spent: number }>,
  inProgress = false,
): GroupOutcome[] {
  return groups
    .filter((g) => g.planned > 0 || g.spent > 0)
    .map((g) => {
      const diff = g.planned - g.spent
      const over = diff < -0.004
      const within = inProgress ? `${money(diff)} disponível` : `sobraram ${money(diff)}`
      return { ...g, over, text: over ? `${money(-diff)} acima` : diff >= 1 ? within : "no planejado" }
    })
}

export const formatMoneyNoCents = money

// Desejo comprado conta no grupo Desejos: a compra é lançada numa categoria
// comum (Compras, Lazer…) e por isso caía no grupo dela. Aqui o valor sai do
// grupo da categoria e entra em Desejos — o total do mês não muda.
export function withBoughtWishes<G extends { kind: string | null; spent: number; categoryIds: string[] }>(
  groups: G[],
  wishes: Array<{ status: string; actualAmount: number | null; estimatedAmount: number; categoryId: string | null }>,
): G[] {
  const out = groups.map((g) => ({ ...g }))
  const wishesGroup = out.find((g) => g.kind === "WISHES")
  if (!wishesGroup) return out
  for (const w of wishes) {
    if (w.status !== "BOUGHT") continue
    const amount = w.actualAmount ?? w.estimatedAmount
    const source = w.categoryId ? out.find((g) => g !== wishesGroup && g.categoryIds.includes(w.categoryId!)) : undefined
    const moved = source ? Math.min(amount, source.spent) : amount
    if (source) source.spent = Math.round((source.spent - moved) * 100) / 100
    wishesGroup.spent = Math.round((wishesGroup.spent + moved) * 100) / 100
  }
  return out
}
