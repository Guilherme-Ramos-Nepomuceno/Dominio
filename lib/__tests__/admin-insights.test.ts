import { test } from "node:test"
import assert from "node:assert/strict"
import { biggestDrop, biggestDropText, eventDetails, eventLabel, presetRange, rangeLabel, lastSeenLabel, percent, stepLabel, weekDelta, weekLabel } from "../admin-insights.ts"

const funnel = [
  { key: "SIGNED_UP", label: "Criou a conta", count: 30, stoppedHere: 7 },
  { key: "OPENED", label: "Abriu o app", count: 23, stoppedHere: 2 },
  { key: "FIRST_TRANSACTION", label: "Registrou o 1º gasto", count: 21, stoppedHere: 5 },
  { key: "PLAN_CONFIRMED", label: "Confirmou o plano", count: 16, stoppedHere: 5 },
]

test("maior abandono do funil, em pessoas", () => {
  assert.deepEqual(biggestDrop(funnel), { from: "Criou a conta", to: "Abriu o app", lost: 7, pct: 23 })
  assert.match(biggestDropText(funnel), /7 pessoas param ali \(23%\)/)
  assert.equal(biggestDropText([funnel[0]]), "Ninguém ficou pelo caminho até agora.")
})

test("comparação com a semana anterior", () => {
  assert.deepEqual(weekDelta(22, 18), { text: "+4 sobre a semana anterior", up: true })
  assert.deepEqual(weekDelta(10, 12), { text: "−2 sobre a semana anterior", up: false })
  assert.deepEqual(weekDelta(5, 5), { text: "igual à semana anterior", up: null })
})

test("último acesso em palavras", () => {
  const now = new Date(2026, 10, 9, 15)
  assert.equal(lastSeenLabel(null, now), "nunca")
  assert.equal(lastSeenLabel(new Date(2026, 10, 9, 8).toISOString(), now), "hoje")
  assert.equal(lastSeenLabel(new Date(2026, 10, 8, 22).toISOString(), now), "ontem")
  assert.equal(lastSeenLabel(new Date(2026, 10, 4).toISOString(), now), "há 5 dias")
  assert.equal(lastSeenLabel(new Date(2026, 9, 12).toISOString(), now), "há 4 semanas")
})

test("pequenos formatos", () => {
  assert.equal(percent(1, 3), 33)
  assert.equal(percent(1, 0), 0)
  assert.equal(stepLabel("group-ESSENTIALS"), "Essenciais")
  assert.equal(weekLabel("2026-11-03"), "3/11")
})

test("eventos brutos em português, com o que importa das propriedades", () => {
  const screen = (k: string) => (k === "home" ? "Home" : k)
  assert.equal(eventLabel("app_opened"), "Abriu o app")
  assert.equal(eventLabel("algo_novo"), "algo novo")
  assert.equal(eventDetails("screen_viewed", { screen: "home" }, screen), "Home")
  assert.equal(eventDetails("transaction_created", { source: "quick" }, screen), "registro rápido")
  assert.equal(eventDetails("inbox_categorized", { count: 3, acceptedSuggestion: true }, screen), "3 lançamentos · com a sugestão")
  assert.equal(eventDetails("guide_step_shown", { tour: "plan", step: "budget" }, screen), "Montar o plano · Orçamento")
  assert.equal(eventDetails("pluggy_sync_completed", { auto: true, imported: 1 }, screen), "automática · 1 novo")
  assert.equal(eventDetails("pluggy_auto_sync", { reason: "RECENT", created: 0, skipped: true }, screen), "sincronizou há pouco")
  assert.equal(eventDetails("wins_viewed", { count: 1, scope: "week" }, screen), "1 vitória · da semana")
  assert.equal(eventDetails("app_opened", null, screen), "")
})

test("atalhos de período do filtro de eventos", () => {
  const today = new Date(2026, 10, 9)
  assert.deepEqual(presetRange("today", today), { from: "2026-11-09", to: "2026-11-09" })
  assert.deepEqual(presetRange("7d", today), { from: "2026-11-03", to: "2026-11-09" })
  assert.deepEqual(presetRange("30d", today), { from: "2026-10-11", to: "2026-11-09" })
  assert.deepEqual(presetRange("all", today), { from: "", to: "" })
  assert.equal(rangeLabel("", ""), "Período")
  assert.match(rangeLabel("2026-11-03", "2026-11-09"), /^3 nov – 9 nov$/)
})

test("filtro por dia vira início e fim do dia local", async () => {
  const { dayBoundary } = await import("../admin-insights.ts")
  assert.equal(new Date(dayBoundary("2026-11-09", "start")).getTime(), new Date(2026, 10, 9).getTime())
  assert.equal(new Date(dayBoundary("2026-11-09", "end")).getTime(), new Date(2026, 10, 9, 23, 59, 59, 999).getTime())
})
