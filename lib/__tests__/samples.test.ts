import { test } from "node:test"
import assert from "node:assert/strict"
import { sampleMonthSeries, samplePeriodWeeks, sampleTransactions, sampleWeekDays } from "../samples.ts"

test("semanas de exemplo: passadas com gasto (uma acima), atual pela metade, futuras vazias", () => {
  const weeks = [
    { index: 0, weekStart: "2026-11-01", weekEnd: "2026-11-07", limit: 500, spent: 0, status: "DONE_UNDER" as const },
    { index: 1, weekStart: "2026-11-08", weekEnd: "2026-11-14", limit: 500, spent: 0, status: "DONE_UNDER" as const },
    { index: 2, weekStart: "2026-11-15", weekEnd: "2026-11-21", limit: 500, spent: 0, status: "CURRENT" as const },
    { index: 3, weekStart: "2026-11-22", weekEnd: "2026-11-30", limit: 600, spent: null, status: "FUTURE" as const },
  ]
  const sample = samplePeriodWeeks(weeks)
  assert.deepEqual(sample.map((w) => [w.status, w.spent]), [
    ["DONE_UNDER", 410],
    ["DONE_OVER", 560],
    ["CURRENT", 225],
    ["FUTURE", null],
  ])
})

test("dias de exemplo só nos dias que já passaram", () => {
  const days = [
    { date: "2026-11-08", spent: 0, isFuture: false },
    { date: "2026-11-09", spent: 0, isFuture: false },
    { date: "2026-11-10", spent: 0, isFuture: true },
  ]
  const sample = sampleWeekDays(days, 100)
  assert.ok(sample[0].spent > 0 && sample[1].spent > 0)
  assert.equal(sample[2].spent, 0)
})

test("curva de exemplo: acumulado sobe até hoje e a projeção segue com faixa", () => {
  const series = Array.from({ length: 10 }, (_, i) => ({
    date: `2026-11-${String(i + 1).padStart(2, "0")}`,
    cumulativeSpent: i < 4 ? 0 : null,
    projected: null,
    projectedLow: null,
    projectedHigh: null,
  }))
  const sample = sampleMonthSeries(series, 1000)
  const real = sample.filter((p) => p.cumulativeSpent !== null).map((p) => p.cumulativeSpent!)
  assert.equal(real.length, 4)
  assert.ok(real.every((v, i) => i === 0 || v > real[i - 1]))
  const last = sample[9]
  assert.ok(last.projected! > real[3] && last.projectedLow! < last.projected! && last.projectedHigh! > last.projected!)
})

test("lançamentos de exemplo: sempre os mesmos, nos últimos 10 dias", () => {
  const today = new Date(2026, 10, 9)
  const a = sampleTransactions(today)
  assert.equal(a.length, 12)
  assert.deepEqual(a, sampleTransactions(today))
  assert.ok(a.every((t) => new Date(t.date) <= new Date(2026, 10, 9, 23)))
})
