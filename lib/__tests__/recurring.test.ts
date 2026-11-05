import { test } from "node:test"
import assert from "node:assert/strict"
import { installmentProgress, monthlyEquivalent, recurringSummary } from "../recurring.ts"

test("monthlyEquivalent: converte cada frequência para o mês", () => {
  assert.equal(monthlyEquivalent(100, "monthly"), 100)
  assert.equal(monthlyEquivalent(1200, "yearly"), 100)
  assert.equal(Math.round(monthlyEquivalent(10, "weekly") * 100) / 100, 43.33)
  assert.equal(monthlyEquivalent(50, undefined), 50)
  assert.equal(monthlyEquivalent(50, "estranha"), 50)
})

test("installmentProgress: parcela atual, quantas faltam e quanto resta", () => {
  assert.deepEqual(installmentProgress({ amount: 100, installments: 10, currentInstallment: 3 }), {
    current: 3,
    total: 10,
    left: 8,
    remaining: 800,
    pct: 20,
  })
  // Dados faltando não quebram a conta.
  assert.deepEqual(installmentProgress({ amount: 50 }), { current: 1, total: 1, left: 1, remaining: 50, pct: 0 })
  assert.equal(installmentProgress({ amount: 10, installments: 3, currentInstallment: 9 }).left, 1)
})

test("recurringSummary: separa saídas, entradas e o que falta das parcelas", () => {
  const s = recurringSummary(
    [
      { amount: 40, type: "expense", recurrence: "monthly" },
      { amount: 1200, type: "expense", recurrence: "yearly" },
      { amount: 5000, type: "income", recurrence: "monthly" },
    ],
    [{ amount: 100, type: "expense", installments: 4, currentInstallment: 2 }],
  )
  assert.equal(s.fixedOut, 140)
  assert.equal(s.fixedIn, 5000)
  assert.equal(s.installmentsOut, 100)
  assert.equal(s.monthlyOut, 240)
  assert.equal(s.installmentsRemaining, 300)
})
