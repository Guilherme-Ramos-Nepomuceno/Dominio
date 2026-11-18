import { test } from "node:test"
import assert from "node:assert/strict"
import { mapCardFromApi } from "../card-mapping.ts"
import { cardInvoiceHref, amountToPay, openInvoiceLabel } from "../card-invoice.ts"

// Resposta real do GET /cards em produção (perfil de teste, 2026-11-17).
const apiCard = {
  id: "c1",
  name: "Cartao teste",
  bankName: "nubank",
  lastDigits: "1234",
  hasCredit: true,
  hasDebit: false,
  kind: "CARD",
  color: "#8a05be",
  limit: "1000",
  closingDate: 1,
  dueDate: 8,
  createdAt: "2026-11-17T12:00:00.000Z",
  spentAmount: 123.45,
  calculatedBalance: 0,
  investmentTotal: 0,
  bank: null,
  openInvoice: { year: 2026, month: 12, closingDate: "2026-12-01", dueDate: "2026-12-08", total: 123.45, registered: 123.45, awaitingReview: 0, manualExcluded: 0, projected: 0 },
}

test("o cartão mapeado mantém a fatura aberta que veio da API", () => {
  const card = mapCardFromApi(apiCard)
  assert.deepEqual(card.openInvoice, apiCard.openInvoice)
})

test("com a fatura aberta mapeada, o link abre dezembro e o rótulo é o de dezembro", () => {
  const card = mapCardFromApi(apiCard)
  assert.equal(cardInvoiceHref(card), "/invoices?card=c1&month=2026-12")
  assert.equal(openInvoiceLabel(card.openInvoice!), "Fatura de dezembro · vence 08/12")
  assert.equal(amountToPay(card), 123.45)
})

test("parcelas previstas vêm no total e à parte; API antiga sem o campo → 0", () => {
  const card = mapCardFromApi({ ...apiCard, openInvoice: { ...apiCard.openInvoice, projected: "289.76" } })
  assert.equal(card.openInvoice!.projected, 289.76)
  const { projected, ...old } = apiCard.openInvoice
  assert.equal(mapCardFromApi({ ...apiCard, openInvoice: old }).openInvoice!.projected, 0)
})

test("cartão sem fatura aberta (conta, dinheiro) fica com null", () => {
  assert.equal(mapCardFromApi({ ...apiCard, hasCredit: false, openInvoice: null }).openInvoice, null)
  assert.equal(mapCardFromApi({ ...apiCard, openInvoice: undefined }).openInvoice, null)
})

test("valores numéricos que vêm como texto (Decimal) viram número", () => {
  const card = mapCardFromApi({ ...apiCard, openInvoice: { ...apiCard.openInvoice, total: "718.38", manualExcluded: "64.28" } })
  assert.equal(card.openInvoice!.total, 718.38)
  assert.equal(card.openInvoice!.manualExcluded, 64.28)
  assert.equal(card.limit, 1000)
})
