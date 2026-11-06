import { test } from "node:test"
import assert from "node:assert/strict"
import { transferBatchSummary } from "../transfer-batch.ts"

const pair = (amount: number, fromCardId: string, toCardId: string) => ({
  from: { amount, cardId: fromCardId },
  to: { amount, cardId: toCardId },
})

const owners: Record<string, string> = { "ana-nu": "Ana", "ana-inter": "Ana", "beto-bb": "Beto" }
const ownerOf = (cardId: string) => owners[cardId]

test("só contas minhas: soma e diz que é entre as suas contas", () => {
  const summary = transferBatchSummary([pair(10, "nu", "bb"), pair(902.54, "bb", "inter"), pair(30, "inter", "nu")], ownerOf)
  assert.equal(summary.count, 3)
  assert.equal(summary.total, 942.54)
  assert.deepEqual(summary.others, [])
  assert.equal(summary.label, "Entre as suas contas")
})

test("com familiares: lista cada pessoa uma vez, na ordem", () => {
  const summary = transferBatchSummary([pair(50, "nu", "ana-nu"), pair(20, "ana-inter", "nu"), pair(5, "beto-bb", "nu")], ownerOf)
  assert.deepEqual(summary.others, ["Ana", "Beto"])
  assert.equal(summary.label, "Entre você, Ana e Beto")
})

test("uma pessoa da família", () => {
  const summary = transferBatchSummary([pair(50, "nu", "ana-nu")], ownerOf)
  assert.equal(summary.label, "Entre você e Ana")
})

test("nenhuma transferência selecionada", () => {
  const summary = transferBatchSummary([], ownerOf)
  assert.equal(summary.count, 0)
  assert.equal(summary.total, 0)
})
