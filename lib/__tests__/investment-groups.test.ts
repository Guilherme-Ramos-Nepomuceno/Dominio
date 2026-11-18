import { test } from "node:test"
import assert from "node:assert/strict"
import { groupInvestments, investmentGroupKey } from "../pluggy-health.ts"

test("CDB, LCI e Tesouro são todos renda fixa", () => {
  assert.equal(investmentGroupKey("FIXED_INCOME"), "FIXED_INCOME")
})

test("ação e ação de bolsa (SECURITY) caem em Ações; tipo desconhecido vai para Outros", () => {
  assert.equal(investmentGroupKey("SECURITY"), "EQUITY")
  assert.equal(investmentGroupKey("EQUITY"), "EQUITY")
  assert.equal(investmentGroupKey("WHATEVER"), "OTHER")
  assert.equal(investmentGroupKey(null), "OTHER")
})

test("agrupa na ordem fixa, soma o saldo e esconde grupo vazio", () => {
  const groups = groupInvestments([
    { name: "LCI Inter", type: "FIXED_INCOME", balance: 1000 },
    { name: "PETR4", type: "SECURITY", balance: 300 },
    { name: "CDB Nubank", type: "FIXED_INCOME", balance: 500 },
  ])

  assert.deepEqual(
    groups.map((g) => [g.label, g.total, g.items.length]),
    [
      ["Renda fixa", 1500, 2],
      ["Ações", 300, 1],
    ],
  )
})

test("sem investimento, nenhum grupo", () => {
  assert.deepEqual(groupInvestments([]), [])
})
