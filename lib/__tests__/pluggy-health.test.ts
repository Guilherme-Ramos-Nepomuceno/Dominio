import { test } from "node:test"
import assert from "node:assert/strict"
import { healthLine, canReconnect, needsAction, healthDetails, isActiveInvestment, rateLabel, investmentSubtitle } from "../pluggy-health.ts"

test("conexão saudável e longe de vencer: sem linha de status nem reconexão", () => {
  const item = { health: "OK" as const, consentDaysLeft: 300 }
  assert.equal(healthLine(item), null)
  assert.equal(canReconnect(item), false)
  assert.equal(needsAction(item), false)
})

test("conexão que caiu mostra o motivo e oferece reconectar", () => {
  const item = { health: "RECONNECT" as const, healthReason: "O banco pediu para você entrar de novo" }
  assert.deepEqual(healthLine(item), { tone: "attention", text: "O banco pediu para você entrar de novo" })
  assert.equal(canReconnect(item), true)
  assert.equal(needsAction(item), true)
})

test("removido no MeuPluggy: pede ação, mas não dá pra reconectar (só remover)", () => {
  const item = { health: "DELETED" as const, healthReason: "Essa conexão foi removida no MeuPluggy" }
  assert.equal(needsAction(item), true)
  assert.equal(canReconnect(item), false)
})

test("autorização perto de vencer: avisa os dias e oferece renovar", () => {
  const item = { health: "OK" as const, consentDaysLeft: 12 }
  assert.deepEqual(healthLine(item), { tone: "attention", text: "A autorização vence em 12 dias" })
  assert.equal(canReconnect(item), true)
  assert.equal(healthLine({ health: "OK", consentDaysLeft: 1 })!.text, "A autorização vence em 1 dia")
})

test("ainda não conferido não assusta ninguém", () => {
  assert.equal(healthLine({ health: "UNKNOWN" }), null)
  assert.equal(healthLine({}), null)
})

test("detalhes: quando o banco atualizou e até quando vale a autorização", () => {
  const lines = healthDetails({
    health: "OK",
    bankUpdatedAt: "2026-11-14T03:10:21.522Z",
    consentExpiresAt: "2027-09-17T19:37:27.619Z",
    consentDaysLeft: 307,
  })
  assert.deepEqual(lines, ["Banco atualizado em 14/11/2026", "Autorização válida até 17/09/2027 (307 dias)"])
})

test("investimento resgatado ou zerado sai da lista principal", () => {
  assert.equal(isActiveInvestment({ status: "ACTIVE", balance: 107.56 }), true)
  assert.equal(isActiveInvestment({ status: "TOTAL_WITHDRAWAL", balance: 0 }), false)
  assert.equal(isActiveInvestment({ status: "ACTIVE", balance: 0 }), false)
})

test("taxa em português: % do CDI, IPCA + fixo, prefixado", () => {
  assert.equal(rateLabel({ rate: 90, rateType: "CDI", fixedAnnualRate: 0 }), "90% do CDI")
  assert.equal(rateLabel({ rate: 100, rateType: "IPCA", fixedAnnualRate: 5.5 }), "IPCA + 5,5%")
  assert.equal(rateLabel({ rate: null, rateType: null, fixedAnnualRate: 12.3 }), "12,3% a.a.")
  assert.equal(rateLabel({ rate: null, rateType: null, fixedAnnualRate: null }), null)
})

test("subtítulo da LCI real do Inter", () => {
  const lci = {
    name: "LCI - BANCO INTER S.A",
    subtype: "LCI",
    balance: 107.56,
    status: "ACTIVE",
    rate: 90,
    rateType: "CDI",
    fixedAnnualRate: 0,
    dueDate: "2031-05-27T03:00:00.000Z",
  }
  assert.equal(investmentSubtitle(lci), "LCI · 90% do CDI · vence 05/2031")
})
