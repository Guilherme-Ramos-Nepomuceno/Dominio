import { test } from "node:test"
import assert from "node:assert/strict"
import { composeSavings, compositionSummary, isStaleSource, remainderAfter, visibleReserves } from "../savings-composition.ts"

const src = (id: string, name: string, amount: number) => ({ id, name, amount, updatedAt: "2026-11-01T00:00:00Z" })

test("composição: banco, fontes e o que sobra sem detalhar", () => {
  const comp = composeSavings({
    currentAmount: 1000,
    bank: [{ investmentId: "i1", name: "CDB", amount: 400 }],
    sources: [src("s1", "Poupança", 200)],
  })
  assert.equal(comp.bank.length, 1)
  assert.deepEqual(comp.sources.map((s) => [s.id, s.amount]), [["s1", 200]])
  assert.equal(comp.rest, 400)
})

test("composição: se o saldo caiu, as fontes mais novas encolhem e a sobra zera", () => {
  const comp = composeSavings({ currentAmount: 500, sources: [src("s1", "A", 400), src("s2", "B", 300)] })
  assert.deepEqual(comp.sources.map((s) => [s.id, s.amount]), [["s1", 400], ["s2", 100]])
  assert.equal(comp.rest, 0)
})

test("composição: fonte que não cabe mais some da tela", () => {
  const comp = composeSavings({ currentAmount: 100, bank: [{ investmentId: "i1", name: "CDB", amount: 300 }], sources: [src("s1", "A", 50)] })
  assert.equal(comp.sources.length, 0)
  assert.equal(comp.rest, 0)
})

test("composição: reserva sem nada além do saldo é só 'sem detalhar'", () => {
  const comp = composeSavings({ currentAmount: 250.5 })
  assert.equal(comp.rest, 250.5)
  assert.equal(compositionSummary(comp), null)
})

test("resumo da composição, com 'e mais N'", () => {
  const base = { bank: [], sources: [src("1", "Poupança", 1)], rest: 0 }
  assert.equal(compositionSummary(base), "Poupança")
  assert.equal(compositionSummary({ ...base, sources: [src("1", "A", 1), src("2", "B", 1)] }), "A e B")
  assert.equal(compositionSummary({ ...base, sources: [src("1", "A", 1), src("2", "B", 1), src("3", "C", 1), src("4", "D", 1)] }), "A, B e mais 2")
})

test("fonte desatualizada há 30 dias ou mais", () => {
  const now = new Date("2026-12-01T00:00:00Z")
  assert.equal(isStaleSource("2026-11-01T00:00:00Z", now), true)
  assert.equal(isStaleSource("2026-11-02T00:00:00Z", now), false)
  assert.equal(isStaleSource("lixo", now), false)
})

test("Guardado zerado some; reserva comum zerada fica", () => {
  const list = visibleReserves([
    { isDefault: true, currentAmount: 0 },
    { isDefault: true, currentAmount: 10 },
    { isDefault: false, currentAmount: 0 },
  ])
  assert.equal(list.length, 2)
})

test("o que sobra do investimento depois de dividir vai para Guardado", () => {
  assert.equal(remainderAfter(1000, [600, 100.1]), 299.9)
  assert.equal(remainderAfter(1000, []), 1000)
  assert.equal(remainderAfter(100, [100]), 0)
})
