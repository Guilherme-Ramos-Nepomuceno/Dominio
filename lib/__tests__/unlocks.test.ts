import { test } from "node:test"
import assert from "node:assert/strict"
import { daysWithSpending, homeUnlocks, initMarker, unlockTransitions, weekUnlocks } from "../unlocks.ts"

const freshWeek = { daysWithSpending: 0, completedWeeks: 0, categoriesThisWeek: 0, hasLastWeek: false }

test("semana nova: tudo bloqueado, com o que falta", () => {
  const statuses = weekUnlocks(freshWeek)
  assert.deepEqual(statuses.map((s) => [s.id, s.unlocked]), [
    ["week-categories", false],
    ["week-projection", false],
    ["week-weeks", false],
    ["week-history", false],
  ])
  assert.deepEqual(statuses.find((s) => s.id === "week-projection")!.progress, { current: 0, target: 3 })
})

test("semana libera aos poucos conforme os dados chegam", () => {
  const statuses = weekUnlocks({ ...freshWeek, daysWithSpending: 7, categoriesThisWeek: 2 })
  const unlocked = statuses.filter((s) => s.unlocked).map((s) => s.id)
  assert.deepEqual(unlocked, ["week-categories", "week-projection"])
  // Progresso não passa do alvo.
  assert.deepEqual(statuses.find((s) => s.id === "week-projection")!.progress, { current: 3, target: 3 })
})

test("home libera a semana e os gastos por dia com o primeiro gasto", () => {
  assert.deepEqual(homeUnlocks({ spentThisWeek: 0, expensesThisMonth: 0 }).map((s) => s.unlocked), [false, false])
  assert.deepEqual(homeUnlocks({ spentThisWeek: 30, expensesThisMonth: 30 }).map((s) => s.unlocked), [true, true])
})

test("primeira visita: o que já está liberado entra sem animação e grava o marcador", () => {
  const statuses = weekUnlocks({ ...freshWeek, categoriesThisWeek: 1, hasLastWeek: true })
  assert.deepEqual(unlockTransitions("week", statuses, []), {
    silentAck: ["week-categories", "week-history", initMarker("week")],
    announce: [],
  })
})

test("depois do marcador, só o que liberou agora é anunciado (uma vez)", () => {
  const statuses = weekUnlocks({ ...freshWeek, categoriesThisWeek: 1, daysWithSpending: 5 })
  const acked = [initMarker("week"), "week-categories"]
  assert.deepEqual(unlockTransitions("week", statuses, acked), { silentAck: [], announce: ["week-projection"] })
  assert.deepEqual(unlockTransitions("week", statuses, [...acked, "week-projection"]).announce, [])
  // O marcador de uma tela não vale para a outra.
  assert.deepEqual(unlockTransitions("home", homeUnlocks({ spentThisWeek: 10, expensesThisMonth: 10 }), acked).announce, [])
})

test("dias com gasto: conta só os dias em que o acumulado subiu", () => {
  const series = [
    { cumulativeSpent: 0 },
    { cumulativeSpent: 40 },
    { cumulativeSpent: 40 },
    { cumulativeSpent: 90 },
    { cumulativeSpent: null },
  ]
  assert.equal(daysWithSpending(series), 2)
})
