import { test } from "node:test"
import assert from "node:assert/strict"
import { amountToPay, cardInvoiceHref, countsAsInvoiceRefund, countsInInvoice, installmentLabel, invoiceTotal, limitUsage, openInvoiceLabel, openInvoiceMonthKey, sumAmounts, totalToPay } from "../card-invoice.ts"
import type { OpenInvoice } from "../types.ts"

const dez: OpenInvoice = { year: 2026, month: 12, closingDate: "2026-12-01", dueDate: "2026-12-08", total: 389.09, registered: 389.09, awaitingReview: 0, manualExcluded: 0, projected: 0 }
const bankCredit = { used: 1444.53, limit: 1600, available: 155.47, minimumPayment: null, dueDate: "2026-11-09", syncedAt: null }

test("link do cartão abre a fatura aberta (dezembro), não o mês corrente", () => {
  assert.equal(cardInvoiceHref({ id: "c1", openInvoice: dez }), "/invoices?card=c1&month=2026-12")
  assert.equal(cardInvoiceHref({ id: "c1", openInvoice: null }), "/invoices?card=c1")
})

test("mês e rótulo da fatura aberta", () => {
  assert.equal(openInvoiceMonthKey({ year: 2027, month: 1 }), "2027-01")
  assert.equal(openInvoiceLabel(dez), "Fatura de dezembro · vence 08/12")
})

test("a pagar é a fatura aberta, não o limite usado", () => {
  assert.equal(amountToPay({ openInvoice: dez, spentAmount: 1444.53 }), 389.09)
  assert.equal(amountToPay({ openInvoice: null, spentAmount: 120 }), 120)
})

test("total a pagar soma as faturas abertas de todos os cartões", () => {
  const cards = [
    { openInvoice: dez },
    { openInvoice: { ...dez, total: 215.81 } },
    { openInvoice: { ...dez, total: 718.38 } },
  ]
  assert.equal(totalToPay(cards), 1323.28)
})

test("limite em uso vem do banco quando ligado", () => {
  const usage = limitUsage({ bank: { account: null, credit: bankCredit }, limit: 1000, spentAmount: 0 })
  assert.equal(usage.limit, 1600)
  assert.equal(usage.free, 155.47)
  assert.ok(Math.abs(usage.used - 1444.53 / 1600) < 1e-9)
})

test("cartão manual: limite em uso pelo que está pendente", () => {
  const usage = limitUsage({ bank: null, limit: 1000, spentAmount: 250 })
  assert.deepEqual(usage, { limit: 1000, used: 0.25, free: 750 })
})

test("fatura de dezembro do BB: compras − estorno + parcelas previstas (mesma conta das duas telas)", () => {
  // Produção, 18/11/2026: compras do banco 1.005,30; estorno do McDonalds 24,04;
  // GOL 02/03, SEPHORA IBIRA 02/02 e AMAZON 07/09 ainda não vieram do banco.
  const projected = sumAmounts([{ amount: 160.97 }, { amount: 64.5 }, { amount: 64.29 }])
  assert.equal(projected, 289.76)
  assert.equal(invoiceTotal({ purchases: 1005.3, refunds: 24.04, projected }), 1271.02)
})

test("estorno do banco desconta; pagamento de fatura (excluído dos totais) e lançamento à mão não", () => {
  const linked = { bank: { account: null, credit: bankCredit } }
  assert.equal(countsAsInvoiceRefund(linked, { externalId: "p1" }, { excludedFromTotals: false }), true)
  assert.equal(countsAsInvoiceRefund(linked, { externalId: "p2" }, { excludedFromTotals: true }), false)
  assert.equal(countsAsInvoiceRefund(linked, { externalId: null }, null), false)
  assert.equal(countsAsInvoiceRefund({ bank: null }, { externalId: "p1" }, null), false)
})

test("rótulo de parcela", () => {
  assert.equal(installmentLabel(7, 9), "7/9")
  assert.equal(installmentLabel(null, null), null)
  assert.equal(installmentLabel(1, 1), null)
})

test("cartão ligado ao banco: lançamento manual não conta na fatura", () => {
  const linked = { bank: { account: null, credit: bankCredit } }
  assert.equal(countsInInvoice(linked, { externalId: "pluggy-1" }), true)
  assert.equal(countsInInvoice(linked, { externalId: null }), false)
  assert.equal(countsInInvoice({ bank: null }, { externalId: null }), true)
})
