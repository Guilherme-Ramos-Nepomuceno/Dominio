import { test } from "node:test"
import assert from "node:assert/strict"
import { dayGroupLabel, dayKey, groupByDay, homeToday, upcomingDayLabel, upcomingOutflows, weekBarSplit } from "../home.ts"

test("dayGroupLabel: hoje, ontem e a data por extenso", () => {
  assert.equal(dayGroupLabel("2026-11-03", "2026-11-03"), "Hoje")
  assert.equal(dayGroupLabel("2026-11-02", "2026-11-03"), "Ontem")
  assert.equal(dayGroupLabel("2026-10-31", "2026-11-01"), "Ontem")
  assert.equal(dayGroupLabel("2026-11-01", "2026-11-03"), "1 de novembro")
})

test("groupByDay: mais recentes primeiro, um grupo por dia", () => {
  const groups = groupByDay(
    [
      { id: "a", date: "2026-11-01T10:00:00" },
      { id: "b", date: "2026-11-03" },
      { id: "c", date: "2026-11-01T20:00:00" },
      { id: "d", date: "2026-11-02" },
    ],
    "2026-11-03",
  )
  assert.deepEqual(
    groups.map((g) => [g.label, g.items.map((t) => t.id)]),
    [
      ["Hoje", ["b"]],
      ["Ontem", ["d"]],
      ["1 de novembro", ["c", "a"]],
    ],
  )
})

test("dayKey: usa o dia local quando a data vem com horário", () => {
  assert.equal(dayKey("2026-11-01"), "2026-11-01")
  const local = new Date(2026, 10, 1, 22, 30)
  assert.equal(dayKey(local.toISOString()), "2026-11-01")
})

test("upcomingDayLabel: hoje, amanhã e o dia da semana", () => {
  assert.equal(upcomingDayLabel("2026-11-03", "2026-11-03"), "hoje")
  assert.equal(upcomingDayLabel("2026-11-04", "2026-11-03"), "amanhã")
  assert.equal(upcomingDayLabel("2026-11-07", "2026-11-03"), "sáb, 7 nov")
})

test("upcomingOutflows: despesas de hoje até domingo e a próxima depois", () => {
  const pending = [
    { id: "aluguel", date: "2026-11-09", type: "expense" },
    { id: "salario", date: "2026-11-05", type: "income" },
    { id: "atrasada", date: "2026-11-01", type: "expense" },
    { id: "luz", date: "2026-11-06", type: "expense" },
    { id: "net", date: "2026-11-03", type: "expense" },
  ]
  const { within, next } = upcomingOutflows(pending, "2026-11-03", "2026-11-07")
  assert.deepEqual(within.map((t) => t.id), ["net", "luz"])
  assert.equal(next?.id, "aluguel")
  assert.equal(upcomingOutflows([], "2026-11-03", "2026-11-07").next, null)
})

test("homeToday: por dia, recuperação, limite usado e estourado", () => {
  assert.deepEqual(homeToday({ available: 300, perDayRemaining: 100 }, null), { today: 100, state: "ok", overBy: 0 })
  assert.deepEqual(homeToday({ available: 300, perDayRemaining: 100 }, { perDayToRecover: 62.8 }), {
    today: 62,
    state: "recover",
    overBy: 0,
  })
  // Nunca mais do que sobra na semana.
  assert.equal(homeToday({ available: 40, perDayRemaining: 80 }, null).today, 40)
  assert.deepEqual(homeToday({ available: 0, perDayRemaining: 0 }, null), { today: 0, state: "used", overBy: 0 })
  assert.deepEqual(homeToday({ available: -44.2, perDayRemaining: 0 }, { perDayToRecover: 10 }), {
    today: 0,
    state: "exceeded",
    overBy: 44.2,
  })
})

test("weekBarSplit: dentro do limite e o trecho que passou", () => {
  assert.deepEqual(weekBarSplit(0, 665), { withinPct: 0, overPct: 0 })
  assert.deepEqual(weekBarSplit(332.5, 665), { withinPct: 50, overPct: 0 })
  const over = weekBarSplit(800, 400)
  assert.equal(over.withinPct, 50)
  assert.equal(over.overPct, 50)
  assert.deepEqual(weekBarSplit(50, 0), { withinPct: 0, overPct: 100 })
})

test("homeToday: sobra guardada zera o disponível sem virar estouro", () => {
  assert.deepEqual(homeToday({ available: 0, perDayRemaining: 0, savedThisWeek: { amount: 46 } }, null), { today: 0, state: "saved", overBy: 0 })
  assert.equal(homeToday({ available: 0, perDayRemaining: 0, savedThisWeek: null }, null).state, "used")
})
