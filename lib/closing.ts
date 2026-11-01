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
