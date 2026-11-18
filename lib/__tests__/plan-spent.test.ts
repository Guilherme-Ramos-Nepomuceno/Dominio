import { test } from "node:test"
import assert from "node:assert/strict"
import { splitSpentByPlanned, type SpentItem } from "../plan.ts"

const item = (id: string, date: string, amount: number): SpentItem => ({
  transactionId: id,
  description: id,
  amount,
  date,
  status: "PAID",
})

test("gasto abaixo do planejado: tudo fica em previsto e não há 'a mais'", () => {
  const items = [item("a", "2026-11-03", 100), item("b", "2026-11-10", 200)]
  const r = splitSpentByPlanned(items, 500)
  assert.deepEqual(r.within.map((i) => i.transactionId), ["a", "b"])
  assert.deepEqual(r.over, [])
  assert.equal(r.overAmount, 0)
})

test("gasto acima: o que passa da linha vai pra 'a mais', em ordem de data", () => {
  const items = [item("c", "2026-11-20", 300), item("a", "2026-11-03", 100), item("b", "2026-11-10", 200)]
  const r = splitSpentByPlanned(items, 350)
  assert.deepEqual(r.within.map((i) => i.transactionId), ["a", "b"])
  assert.deepEqual(r.over.map((i) => i.transactionId), ["c"])
  assert.equal(r.overAmount, 250)
})

test("o item que cruza a linha já conta como 'a mais'", () => {
  const r = splitSpentByPlanned([item("a", "2026-11-03", 400)], 350)
  assert.deepEqual(r.within, [])
  assert.deepEqual(r.over.map((i) => i.transactionId), ["a"])
  assert.equal(r.overAmount, 50)
})

test("sem planejado (0): todo gasto é 'a mais'", () => {
  const r = splitSpentByPlanned([item("a", "2026-11-03", 80)], 0)
  assert.deepEqual(r.within, [])
  assert.equal(r.overAmount, 80)
})

test("sem gastos: nada em nenhuma lista", () => {
  const r = splitSpentByPlanned([], 100)
  assert.deepEqual(r, { within: [], over: [], overAmount: 0 })
})
