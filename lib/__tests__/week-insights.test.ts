import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mapWeek,
  paceBadge,
  projectionMessage,
  dayBars,
  weekChartSummary,
  monthChartData,
  lastRealPoint,
  monthChartSummary,
  compactAmount,
  weekRows,
  categoryRows,
  lastWeekLabel,
  niceTicks,
} from "../week.ts"

const fmt = (v: number) => `R$ ${v.toFixed(2)}`

test("mapeia os campos novos da semana (e tolera a resposta antiga)", () => {
  const old = mapWeek({ enabled: true, limit: 100, monthPace: { projectedDiff: 10 } })
  assert.deepEqual(old.days, [])
  assert.deepEqual(old.weeks, [])
  assert.equal(old.lastWeek, null)
  assert.equal(old.paceStatus, "ON_TRACK")
  assert.equal(old.monthPace.confidence, "LOW")

  const w = mapWeek({
    enabled: true,
    days: [{ date: "2026-11-01", spent: "157", isFuture: false }],
    idealPerDay: "48.33",
    paceStatus: "OVER",
    monthPace: { projectedVariableSpend: 1631, projectedDiff: -181, confidence: "MEDIUM" },
    monthSeries: [{ date: "2026-11-01", cumulativeSpent: 157, projected: null, projectedLow: null, projectedHigh: null }],
    weeks: [{ index: 1, weekStart: "2026-11-01", weekEnd: "2026-11-07", limit: 338.33, spent: null, status: "FUTURE" }],
    categories: [{ categoryId: null, name: "Sem categoria", spentThisWeek: 22, transactionCount: 1, plannedVariable: null, spentInPeriod: 22 }],
    lastWeek: { spent: "205.5", limit: 400 },
  })
  assert.equal(w.days[0].spent, 157)
  assert.equal(w.idealPerDay, 48.33)
  assert.equal(w.paceStatus, "OVER")
  assert.equal(w.monthPace.confidence, "MEDIUM")
  assert.equal(w.monthSeries[0].projected, null)
  assert.equal(w.weeks[0].spent, null)
  assert.equal(w.categories[0].categoryId, null)
  assert.deepEqual(w.lastWeek, { spent: 205.5, limit: 400 })
})

test("selo de ritmo: texto para cada estado", () => {
  assert.deepEqual([paceBadge("UNDER").label, paceBadge("UNDER").tone], ["Abaixo do ritmo", "good"])
  assert.deepEqual([paceBadge("ON_TRACK").label, paceBadge("ON_TRACK").tone], ["No ritmo", "neutral"])
  assert.deepEqual([paceBadge("OVER").label, paceBadge("OVER").tone], ["Acima do ritmo", "over"])
})

test("projeção: sem número com confiança baixa", () => {
  const early = projectionMessage({ projectedDiff: 5000, confidence: "LOW" }, fmt)
  assert.equal(early.text, "Ainda é cedo para projetar — por enquanto vale o seu plano.")
  assert.doesNotMatch(early.text, /R\$/)
  assert.equal(projectionMessage({ projectedDiff: 250, confidence: "HIGH" }, fmt).text, "No ritmo atual, você termina com R$ 250.00 de sobra.")
  assert.equal(projectionMessage({ projectedDiff: -80, confidence: "MEDIUM" }, fmt).text, "No ritmo atual, você termina R$ 80.00 acima do plano.")
  assert.equal(projectionMessage({ projectedDiff: -80, confidence: "MEDIUM" }, fmt).tone, "over")
  assert.equal(projectionMessage({ projectedDiff: 0.2, confidence: "HIGH" }, fmt).tone, "neutral")
})

test("barras da semana: rótulos, hoje e futuro", () => {
  const bars = dayBars([
    { date: "2026-11-01", spent: 157, isFuture: false },
    { date: "2026-11-02", spent: 38.9, isFuture: false },
    { date: "2026-11-03", spent: 99, isFuture: true },
  ])
  assert.deepEqual(bars.map((b) => [b.label, b.dayOfMonth, b.spent, b.isToday, b.isFuture]), [
    ["dom", 1, 157, false, false],
    ["seg", 2, 38.9, true, false],
    ["ter", 3, 0, false, true],
  ])
  assert.equal(
    weekChartSummary(bars, 48.33, fmt),
    "Gasto por dia nesta semana: dom R$ 157.00, seg (hoje) R$ 38.90. Ideal: R$ 48.33 por dia.",
  )
})

test("série do mês: real, projeção e faixa", () => {
  const series = [
    { date: "2026-11-01", cumulativeSpent: 100, projected: null, projectedLow: null, projectedHigh: null },
    { date: "2026-11-02", cumulativeSpent: 150, projected: 150, projectedLow: 150, projectedHigh: 150 },
    { date: "2026-11-03", cumulativeSpent: null, projected: 200, projectedLow: 190, projectedHigh: 210 },
  ]
  const data = monthChartData(series)
  assert.deepEqual(data[0], { date: "2026-11-01", dayOfMonth: 1, real: 100, projected: null, band: null })
  assert.deepEqual(data[2].band, [190, 210])
  assert.deepEqual(lastRealPoint(series), { date: "2026-11-02", value: 150 })
  assert.equal(
    monthChartSummary({ monthSeries: series, monthPace: { projectedVariableSpend: 200, projectedDiff: 800, confidence: "MEDIUM" }, variablePlanned: 1000, hasPlan: true }, fmt),
    "Gasto variável até hoje: R$ 150.00. Planejado: R$ 1000.00. Projeção para o fim do mês: R$ 200.00 (entre R$ 190.00 e R$ 210.00).",
  )
  assert.match(
    monthChartSummary({ monthSeries: series, monthPace: { projectedVariableSpend: 200, projectedDiff: 800, confidence: "LOW" }, variablePlanned: 1000, hasPlan: false }, fmt),
    /Meta mensal: R\$ 1000\.00\. Ainda é cedo para projetar\.$/,
  )
  assert.equal(compactAmount(450.4), "450")
  assert.equal(compactAmount(1500), "1,5 mil")
})

test("semanas do mês: dentro, estourou, atual e prevista", () => {
  const rows = weekRows(
    [
      { index: 1, weekStart: "2026-11-01", weekEnd: "2026-11-07", limit: 466.67, spent: 600, status: "DONE_OVER" },
      { index: 2, weekStart: "2026-11-08", weekEnd: "2026-11-14", limit: 426.09, spent: 380, status: "DONE_UNDER" },
      { index: 3, weekStart: "2026-11-15", weekEnd: "2026-11-21", limit: 446.25, spent: 100, status: "CURRENT" },
      { index: 4, weekStart: "2026-11-22", weekEnd: "2026-11-30", limit: 620, spent: null, status: "FUTURE" },
    ],
    fmt,
  )
  assert.deepEqual(rows.map((r) => [r.title, r.range, r.kind, r.diffText]), [
    ["Semana 1", "1 – 7 nov", "over", "R$ 133.33 acima"],
    ["Semana 2", "8 – 14 nov", "under", "R$ 46.09 dentro"],
    ["Semana 3", "15 – 21 nov", "current", "faltam R$ 346.25"],
    ["Semana 4", "22 – 30 nov", "future", "prevista"],
  ])
  assert.equal(rows[3].spentText, "—")
})

test("para onde foi: barras relativas, % do planejado e sem categoria", () => {
  const rows = categoryRows(
    [
      { categoryId: "d", name: "Delivery", color: "#f00", icon: null, spentThisWeek: 100, transactionCount: 3, plannedVariable: 250, spentInPeriod: 125 },
      { categoryId: "l", name: "Lazer", color: null, icon: null, spentThisWeek: 50, transactionCount: 1, plannedVariable: null, spentInPeriod: 50 },
      { categoryId: null, name: "Sem categoria", color: null, icon: null, spentThisWeek: 0.5, transactionCount: 2, plannedVariable: null, spentInPeriod: 0.5 },
    ],
    fmt,
  )
  assert.deepEqual(rows.map((r) => [r.name, r.barPct, r.plannedText]), [
    ["Delivery", 100, "50% do planejado do mês"],
    ["Lazer", 50, null],
    ["Sem categoria (2)", 2, null],
  ])
})

test("semana passada", () => {
  assert.equal(lastWeekLabel(null, fmt), null)
  assert.equal(lastWeekLabel({ spent: 300, limit: 400 }, fmt), "Semana passada: R$ 300.00, 75% do limite")
  assert.equal(lastWeekLabel({ spent: 30, limit: 0 }, fmt), "Semana passada: R$ 30.00")
})

test("ticks redondos do eixo", () => {
  assert.deepEqual(niceTicks(1900), [0, 1000, 2000])
  assert.deepEqual(niceTicks(1450), [0, 500, 1000, 1500])
  assert.deepEqual(niceTicks(1520), [0, 1000, 2000])
  assert.deepEqual(niceTicks(0), [0, 1])
})
