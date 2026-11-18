// Fatura aberta do cartão na tela de Cartões e na de Faturas. Funções puras,
// testáveis com node:test.

import type { Card, OpenInvoice } from "./types"

const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

// "2026-12" — o mês da fatura no formato do seletor de mês do app.
export function openInvoiceMonthKey(invoice: Pick<OpenInvoice, "year" | "month">): string {
  return `${invoice.year}-${String(invoice.month).padStart(2, "0")}`
}

// "2026-12-08" → "08/12" (data pura, sem passar por Date/fuso).
export function dayMonth(isoDate: string): string {
  const [, month, day] = isoDate.split("-")
  return `${day}/${month}`
}

// "Fatura de dezembro · vence 08/12"
export function openInvoiceLabel(invoice: OpenInvoice): string {
  return `Fatura de ${MONTHS[invoice.month - 1]} · vence ${dayMonth(invoice.dueDate)}`
}

// Link do cartão: abre a fatura aberta, não o mês corrente (em novembro, um
// cartão que fecha dia 1 já está na fatura de dezembro).
export function cardInvoiceHref(card: Pick<Card, "id" | "openInvoice">): string {
  const month = card.openInvoice ? `&month=${openInvoiceMonthKey(card.openInvoice)}` : ""
  return `/invoices?card=${card.id}${month}`
}

// Quanto vai pagar no cartão: a fatura aberta; sem ela (API antiga), o que
// estiver pendente no cartão.
export function amountToPay(card: Pick<Card, "openInvoice" | "spentAmount">): number {
  return card.openInvoice?.total ?? card.spentAmount ?? 0
}

export function totalToPay(cards: Array<Pick<Card, "openInvoice" | "spentAmount">>): number {
  return Math.round(cards.reduce((sum, c) => sum + amountToPay(c), 0) * 100) / 100
}

// Fração do limite em uso (0–1). Ligado ao banco: o que o banco diz que está
// comprometido (limite − disponível), que inclui fatura fechada e parcelas
// futuras — não só a fatura aberta.
export function limitUsage(card: Pick<Card, "bank" | "limit" | "spentAmount">): { limit: number; used: number; free: number } {
  const bank = card.bank?.credit ?? null
  const limit = bank?.limit ?? card.limit ?? 0
  const usedAmount = bank ? (bank.limit != null && bank.available != null ? bank.limit - bank.available : bank.used) : card.spentAmount ?? 0
  const free = bank?.available ?? limit - usedAmount
  const used = limit > 0 ? Math.min(1, Math.max(0, usedAmount / limit)) : 0
  return { limit, used, free }
}

// Em cartão ligado ao banco, lançamento manual (sem externalId) não entra na
// fatura — o banco é a fonte; somar os dois contaria a mesma compra duas vezes.
export function countsInInvoice(card: Pick<Card, "bank">, transaction: { externalId?: string | null }): boolean {
  if (!card.bank?.credit) return true
  return !!transaction.externalId
}

// Estorno que desconta da fatura do cartão ligado ao banco (como a API faz no
// total da tela de Cartões): entrada que veio do banco e não é pagamento de
// fatura nem transferência — essas têm categoria `excludedFromTotals`.
export function countsAsInvoiceRefund(
  card: Pick<Card, "bank">,
  transaction: { externalId?: string | null },
  category?: { excludedFromTotals?: boolean } | null,
): boolean {
  if (!card.bank?.credit) return false
  return !!transaction.externalId && !category?.excludedFromTotals
}

export function sumAmounts(items: ReadonlyArray<{ amount: number }> | null | undefined): number {
  return Math.round((items ?? []).reduce((sum, i) => sum + i.amount, 0) * 100) / 100
}

// Total da fatura no app: compras − estornos + parcelas previstas (as que o
// banco ainda não mandou). Mesma conta do "a pagar" da tela de Cartões.
export function invoiceTotal(parts: { purchases: number; refunds: number; projected: number }): number {
  return Math.round((parts.purchases - parts.refunds + parts.projected) * 100) / 100
}

// "3/5" de uma parcela, ou nada.
export function installmentLabel(current: number | null | undefined, total: number | null | undefined): string | null {
  return current && total && total > 1 ? `${current}/${total}` : null
}
