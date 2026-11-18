// Cartão como vem da API → Card do app. Função pura (testável com node:test):
// todo campo novo da API precisa passar por aqui, senão a tela nunca o vê.

import type { BankName, Card, OpenInvoice } from "./types"

function mapOpenInvoice(raw: any): OpenInvoice | null {
  if (!raw) return null
  return {
    year: Number(raw.year),
    month: Number(raw.month),
    closingDate: String(raw.closingDate),
    dueDate: String(raw.dueDate),
    total: Number(raw.total ?? 0),
    registered: Number(raw.registered ?? 0),
    awaitingReview: Number(raw.awaitingReview ?? 0),
    manualExcluded: Number(raw.manualExcluded ?? 0),
    projected: Number(raw.projected ?? 0),
  }
}

export function mapCardFromApi(c: any): Card {
  return {
    id: c.id,
    name: c.name,
    bankName: c.bankName as BankName,
    lastDigits: c.lastDigits,
    hasCredit: !!c.hasCredit,
    hasDebit: !!c.hasDebit,
    kind: String(c.kind ?? "CARD").toLowerCase() as Card["kind"],
    color: c.color,
    limit: c.limit != null ? Number(c.limit) : undefined,
    dueDate: c.dueDate ?? undefined,
    closingDate: c.closingDate ?? undefined,
    createdAt: c.createdAt,
    spentAmount: c.spentAmount != null ? Number(c.spentAmount) : undefined,
    calculatedBalance: c.calculatedBalance != null ? Number(c.calculatedBalance) : undefined,
    investmentTotal: c.investmentTotal != null ? Number(c.investmentTotal) : undefined,
    bank: c.bank ?? null,
    // Fatura aberta (o que vai pagar no próximo vencimento) — sem ela a tela
    // de Cartões volta a mostrar o limite usado e o link abre o mês corrente.
    openInvoice: mapOpenInvoice(c.openInvoice),
  }
}
