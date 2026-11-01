import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mapPlan,
  barSegments,
  wishFitState,
  newlyFittingWishIds,
  moveItem,
  allocateWishes,
  withPlannedVariable,
  withBudget,
  withWishOrder,
  planTotals,
  parseMoneyInput,
  effectiveBudget,
  isPlanEditable,
  type Wish,
} from "../plan.ts"

const wish = (id: string, priority: number, estimatedAmount: number, status: Wish["status"] = "OPEN"): Wish => ({
  id,
  userId: "u",
  year: 2026,
  month: 11,
  name: id,
  estimatedAmount,
  actualAmount: null,
  categoryId: null,
  priority,
  status,
  postponedCount: 0,
  link: null,
  notes: null,
  transactionId: null,
  goalId: null,
})

const rawPlan = {
  year: 2026,
  month: 11,
  periodStart: "2026-11-01",
  periodEnd: "2026-11-30",
  status: "NONE",
  budgetAmount: null,
  budgetSource: "INCOME",
  suggestedBudget: "5000.00",
  weeklyLimitEnabled: true,
  groups: [
    {
      id: "g2",
      name: "Estilo de vida",
      kind: "LIFESTYLE",
      order: 2,
      countsInWeeklyLimit: true,
      committed: 0,
      plannedVariable: 1000,
      planned: 1000,
      spent: 200,
      categories: [
        { categoryId: "lazer", name: "Lazer", color: "#a", committed: 0, committedItems: [], plannedVariable: "1000", originalPlannedVariable: null, spent: 200, spentVariable: 200, average3m: 900 },
      ],
    },
    {
      id: "g1",
      name: "Essenciais",
      kind: "ESSENTIALS",
      order: 1,
      countsInWeeklyLimit: false,
      committed: 2000,
      plannedVariable: 1000,
      planned: 3000,
      spent: 2100,
      categories: [
        {
          categoryId: "casa",
          name: "Moradia",
          color: "#b",
          committed: 2000,
          committedItems: [{ transactionId: "t1", description: "Aluguel", amount: "2000", date: "2026-11-05", kind: "RECURRING" }],
          plannedVariable: 1000,
          originalPlannedVariable: 1200,
          spent: 2100,
          spentVariable: 100,
          average3m: 1100,
        },
      ],
    },
  ],
  uncategorized: { spent: 100 },
  freeMargin: 900,
  wishes: [
    { ...wish("b", 1, 800), fits: false, missing: 0 },
    { ...wish("a", 0, 500), fits: true, missing: 0 },
  ],
  wishesPlanned: 500,
  leftover: 400,
}

test("mapeia o plano, ordenando grupos e desejos e convertendo números", () => {
  const plan = mapPlan(rawPlan)
  assert.deepEqual(plan.groups.map((g) => g.id), ["g1", "g2"])
  assert.deepEqual(plan.wishes.map((w) => w.id), ["a", "b"])
  assert.equal(plan.suggestedBudget, 5000)
  assert.equal(plan.groups[1].categories[0].plannedVariable, 1000)
  assert.equal(plan.groups[0].categories[0].committedItems[0].amount, 2000)
  assert.equal(plan.budgetAmount, null)
  assert.equal(effectiveBudget(plan), 5000)
  assert.equal(isPlanEditable(plan.status), true)
  assert.equal(isPlanEditable("CLOSED"), false)
})

test("barra do grupo: comprometido, variável e gasto na mesma escala", () => {
  const b = barSegments({ committed: 2000, plannedVariable: 1000, spent: 1500 })
  assert.equal(Math.round(b.committedPct), 67)
  assert.equal(Math.round(b.variablePct), 33)
  assert.equal(b.spentPct, 50)
  assert.equal(b.overspent, false)
  const over = barSegments({ committed: 0, plannedVariable: 100, spent: 200 })
  assert.equal(over.overspent, true)
  assert.equal(over.overAmount, 100)
  assert.equal(over.variablePct, 50)
  assert.equal(over.spentPct, 100)
  assert.deepEqual(barSegments({ committed: 0, plannedVariable: 0, spent: 0 }).spentPct, 0)
})

test("estado do desejo", () => {
  assert.equal(wishFitState({ fits: true, missing: 0, estimatedAmount: 100 }), "fits")
  assert.equal(wishFitState({ fits: false, missing: 30, estimatedAmount: 100 }), "partial")
  assert.equal(wishFitState({ fits: false, missing: 100, estimatedAmount: 100 }), "none")
})

test("distribui a margem pelos desejos em ordem de prioridade (regra do backend)", () => {
  const { wishes, wishesPlanned } = allocateWishes(
    [wish("c", 2, 300), wish("a", 0, 500), wish("b", 1, 400), wish("x", 3, 10, "BOUGHT"), wish("r", 4, 99, "REMOVED")],
    710,
  )
  // Comprado (10) sai primeiro: sobram 700 → "a" cabe; "b" acumula 900, falta 200; "c" não cabe (falta tudo).
  assert.deepEqual(
    wishes.map((w) => [w.id, w.fits, w.missing]),
    [
      ["a", true, 0],
      ["b", false, 200],
      ["c", false, 300],
      ["x", true, 0],
      ["r", false, 0],
    ],
  )
  assert.equal(wishesPlanned, 510)
  assert.deepEqual(allocateWishes([wish("a", 0, 10)], -50).wishes.map((w) => w.missing), [60])
})

test("reduzir uma categoria recalcula a margem e faz um desejo caber", () => {
  const plan = mapPlan(rawPlan)
  // Margem = 5000 - (3000 + 1000) - 100 (sem categoria) = 900 → "a" (500) cabe, "b" (800) falta 400.
  const before = withBudget(plan, null, "INCOME")
  assert.equal(before.freeMargin, 900)
  assert.deepEqual(before.wishes.map((w) => [w.fits, w.missing]), [[true, 0], [false, 400]])
  const after = withPlannedVariable(before, "lazer", 600)
  assert.equal(after.groups[1].plannedVariable, 600)
  assert.equal(after.groups[1].planned, 600)
  assert.equal(after.freeMargin, 1300)
  assert.deepEqual(newlyFittingWishIds(before.wishes, after.wishes), ["b"])
  assert.equal(after.wishesPlanned, 1300)
  assert.equal(after.leftover, 0)
  assert.deepEqual(planTotals(after), { planned: 3600, committed: 2000, spent: 2400 })
})

test("grupo Desejos: planejado são os desejos que cabem", () => {
  const plan = mapPlan({
    ...rawPlan,
    groups: [...rawPlan.groups, { id: "g3", name: "Desejos", kind: "WISHES", order: 3, countsInWeeklyLimit: false, committed: 0, plannedVariable: 0, planned: 0, spent: 0, categories: [] }],
  })
  const result = withBudget(plan, null, "INCOME")
  const wishesGroup = result.groups.find((g) => g.kind === "WISHES")!
  assert.equal(result.freeMargin, 900)
  assert.equal(wishesGroup.planned, 500)
})

test("orçamento manual e nova ordem dos desejos", () => {
  const plan = withBudget(mapPlan(rawPlan), 4000, "MANUAL")
  assert.equal(plan.freeMargin, -100)
  assert.deepEqual(plan.wishes.map((w) => w.fits), [false, false])
  const reordered = withWishOrder(withBudget(plan, 4900, "MANUAL"), ["b", "a"])
  assert.deepEqual(reordered.wishes.map((w) => [w.id, w.fits]), [["b", true], ["a", false]])
})

test("move item na lista", () => {
  assert.deepEqual(moveItem([1, 2, 3], 0, 2), [2, 3, 1])
  assert.deepEqual(moveItem([1, 2, 3], 2, 0), [3, 1, 2])
  assert.deepEqual(moveItem([1, 2, 3], 1, 10), [1, 3, 2])
  assert.deepEqual(moveItem([1, 2, 3], 1, 1), [1, 2, 3])
})

test("lê valores digitados em pt-BR", () => {
  assert.equal(parseMoneyInput("1.234,56"), 1234.56)
  assert.equal(parseMoneyInput("R$ 80"), 80)
  assert.equal(parseMoneyInput("12.500"), 12500)
  assert.equal(parseMoneyInput("99.9"), 99.9)
  assert.equal(parseMoneyInput(""), null)
  assert.equal(parseMoneyInput("abc"), null)
})
