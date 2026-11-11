import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mapWeek,
  weekProgress,
  formatWeekday,
  formatWeekRange,
  paceMessage,
  streakLabel,
  sortWeekTransactions,
  daysLeftLabel,
  dayDetail,
  paceBadge,
  isWeekExceeded,
  carryOverSummary,
  mapWeekSave,
  weekSaveLabel,
} from "../week.ts"
import {
  mapClosingData,
  defaultDecisions,
  postponeWarning,
  validateLeftover,
  buildCloseBody,
  adherenceTone,
  closingTiming,
  closingResult,
  groupOutcomes,
  withBoughtWishes,
} from "../closing.ts"
import { urlBase64ToUint8Array, isIOS, pushSupport, mapNotificationPrefs } from "../push.ts"

const fmt = (v: number) => `R$ ${v.toFixed(2)}`

test("mapeia a semana (desligada só traz o intervalo)", () => {
  const off = mapWeek({ enabled: false, weekStart: "2026-11-01", weekEnd: "2026-11-07" })
  assert.equal(off.enabled, false)
  assert.equal(off.limit, 0)
  assert.deepEqual(off.transactions, [])
  const on = mapWeek({ enabled: true, limit: "500", available: "120.5", monthPace: { projectedDiff: "-30" }, transactions: [{ id: 1, amount: "10", date: "2026-11-02", categoryId: null }] })
  assert.equal(on.available, 120.5)
  assert.equal(on.monthPace.projectedDiff, -30)
  assert.equal(on.transactions[0].id, "1")
})

test("barra da semana e tons", () => {
  assert.deepEqual(weekProgress(100, 500), { pct: 20, tone: "ok" })
  assert.equal(weekProgress(400, 500).tone, "warning")
  assert.deepEqual(weekProgress(600, 500), { pct: 100, tone: "over" })
  assert.equal(weekProgress(0, 0).tone, "ok")
})

test("datas da semana sem deslocar pelo fuso", () => {
  assert.equal(formatWeekday("2026-11-08"), "domingo, 8 nov")
  assert.equal(formatWeekday("2026-11-08T00:00:00.000Z"), "domingo, 8 nov")
  assert.equal(formatWeekRange("2026-11-02", "2026-11-08"), "2 – 8 nov")
  assert.equal(formatWeekRange("2026-11-30", "2026-12-06"), "30 nov – 6 dez")
  assert.equal(daysLeftLabel(1), "último dia da semana")
  assert.equal(daysLeftLabel(4), "4 dias até o fim da semana")
})

test("ritmo do mês e sequência", () => {
  assert.equal(paceMessage(250, fmt).tone, "ok")
  assert.match(paceMessage(250, fmt).text, /R\$ 250\.00 de sobra/)
  assert.match(paceMessage(-80, fmt).text, /R\$ 80\.00 acima/)
  assert.equal(paceMessage(0.4, fmt).tone, "neutral")
  assert.equal(streakLabel(0), null)
  assert.equal(streakLabel(1), "1 semana no azul")
  assert.equal(streakLabel(3), "3 semanas seguidas no azul")
})

test("gastos da semana em ordem e sem categoria contados", () => {
  const { list, uncategorized } = sortWeekTransactions([
    { id: "a", description: "", amount: 1, date: "2026-11-02", categoryId: "x" },
    { id: "b", description: "", amount: 1, date: "2026-11-04", categoryId: null },
  ])
  assert.deepEqual(list.map((t) => t.id), ["b", "a"])
  assert.equal(uncategorized, 1)
})

test("fechamento: resumo, decisões e sobra", () => {
  const data = mapClosingData({
    summary: { budgetAmount: "5000", plannedTotal: 4800, spentTotal: 4500, adherencePct: 93.75, leftover: 500 },
    wishes: [
      { id: "w1", status: "OPEN", postponedCount: 2, estimatedAmount: 100 },
      { id: "w2", status: "BOUGHT", estimatedAmount: 50 },
    ],
  })
  assert.equal(data.summary.budgetAmount, 5000)
  assert.deepEqual(data.openWishes.map((w) => w.id), ["w1"])
  assert.deepEqual(defaultDecisions(data.openWishes), { w1: "NEXT_MONTH" })
  assert.equal(postponeWarning(data.openWishes[0]), "Já foi adiado 2 vezes. Vale virar objetivo?")
  assert.equal(postponeWarning({ postponedCount: 1 }), null)

  assert.equal(validateLeftover({ destination: null, id: null, amount: null }, 500), null)
  assert.equal(validateLeftover({ destination: "GOAL", id: null, amount: 10 }, 500), "Escolha o objetivo.")
  assert.equal(validateLeftover({ destination: "SAVINGS", id: "s", amount: 600 }, 500), "O valor passa da sobra do mês.")
  assert.equal(validateLeftover({ destination: "SAVINGS", id: "s", amount: 500 }, 500), null)

  assert.deepEqual(buildCloseBody({ w1: "GOAL" }, { destination: "SAVINGS", id: "s", amount: 200 }), {
    wishDecisions: [{ wishId: "w1", decision: "GOAL" }],
    leftover: { destination: "SAVINGS", id: "s", amount: 200 },
  })
  assert.deepEqual(buildCloseBody({}, { destination: null, id: null, amount: null }), { wishDecisions: [] })
  assert.equal(adherenceTone(95), "ok")
  assert.equal(adherenceTone(105), "warning")
  assert.equal(adherenceTone(130), "over")
})

test("push: chave VAPID, iOS e suporte", () => {
  assert.deepEqual(Array.from(urlBase64ToUint8Array("AQID_-8")), [1, 2, 3, 255, 239])
  assert.equal(isIOS("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), true)
  assert.equal(isIOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 5), true)
  assert.equal(isIOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", 0), false)
  const base = { hasServiceWorker: true, hasPushManager: true, hasNotification: true, ios: false, standalone: false }
  assert.equal(pushSupport(base), "supported")
  assert.equal(pushSupport({ ...base, ios: true }), "ios-needs-install")
  assert.equal(pushSupport({ ...base, ios: true, standalone: true }), "supported")
  assert.equal(pushSupport({ ...base, hasPushManager: false }), "unsupported")
  assert.deepEqual(mapNotificationPrefs({ weekly80: false }), { weekStart: true, weekly80: false, monthPlan: true, bankTransactions: true })
})

test("closingTiming: mês em andamento até o último dia do período", () => {
  assert.deepEqual(closingTiming("2026-11-30", "2026-11-03"), { inProgress: true, endLabel: "30 nov" })
  assert.deepEqual(closingTiming("2026-11-30", "2026-11-30"), { inProgress: true, endLabel: "30 nov" })
  assert.deepEqual(closingTiming("2026-11-30T00:00:00.000Z", "2026-12-01"), { inProgress: false, endLabel: "30 nov" })
  assert.equal(closingTiming("", "2026-12-01").inProgress, false)
})

const brlNoCents = (s: string) => s.replace(/R\$ /g, `R$${String.fromCharCode(160)}`)

test("closingResult: sobra, mês em andamento, acima do orçamento e sem plano", () => {
  const summary = { budgetAmount: 7200, plannedTotal: 4800, spentTotal: 4205, adherencePct: 87.6, savedFromWeeks: 0, leftover: 2995 }
  const ended = closingResult(summary, "outubro", { inProgress: false, hasPlan: true })
  assert.equal(ended.label, "Outubro terminou com")
  assert.equal(ended.suffix, "de sobra")
  assert.equal(ended.tone, "good")
  assert.equal(ended.line, brlNoCents("R$ 4.205 gastos de R$ 4.800 planejado (88%)"))
  const partial = closingResult({ ...summary, spentTotal: 430, leftover: 6770 }, "novembro", { inProgress: true, hasPlan: true })
  assert.deepEqual(
    [partial.label, partial.value, partial.suffix, partial.line],
    ["Novembro, até agora", 430, brlNoCents("gastos de R$ 4.800 planejado"), "9% do planejado do mês"],
  )
  const over = closingResult({ ...summary, spentTotal: 7500, leftover: -300 }, "outubro", { inProgress: false, hasPlan: true })
  assert.deepEqual([over.value, over.suffix, over.tone], [300, "acima do orçamento", "over"])
  assert.equal(
    closingResult({ ...summary, plannedTotal: 0 }, "outubro", { inProgress: false, hasPlan: false }).line,
    brlNoCents("R$ 4.205 gastos de R$ 7.200 de receitas"),
  )
})

test("groupOutcomes: dentro, acima e grupos vazios de fora", () => {
  const rows = groupOutcomes([
    { id: "a", name: "Essenciais", color: "#1", planned: 3000, spent: 2810 },
    { id: "b", name: "Estilo de vida", color: "#2", planned: 800, spent: 920 },
    { id: "c", name: "Futuro", color: "#3", planned: 0, spent: 0 },
    { id: "d", name: "Desejos", color: "#4", planned: 300, spent: 300 },
  ])
  assert.deepEqual(rows.map((r) => [r.id, r.over, r.text]), [
    ["a", false, brlNoCents("sobraram R$ 190")],
    ["b", true, brlNoCents("R$ 120 acima")],
    ["d", false, "no planejado"],
  ])
  assert.equal(groupOutcomes([{ id: "a", name: "Essenciais", color: null, planned: 3000, spent: 168 }], true)[0].text, brlNoCents("R$ 2.832 disponível"))
})

test("withBoughtWishes: compra de desejo sai do grupo da categoria e entra em Desejos", () => {
  const groups = [
    { id: "life", kind: "LIFESTYLE", spent: 1285, categoryIds: ["compras", "lazer"] },
    { id: "wish", kind: "WISHES", spent: 0, categoryIds: [] },
  ]
  const wishes = [
    { status: "BOUGHT", actualAmount: 329.9, estimatedAmount: 349, categoryId: "compras" },
    { status: "OPEN", actualAmount: null, estimatedAmount: 890, categoryId: "compras" },
  ]
  const out = withBoughtWishes(groups, wishes)
  assert.deepEqual(out.map((g) => [g.id, g.spent]), [["life", 955.1], ["wish", 329.9]])
  assert.equal(groups[0].spent, 1285) // não altera a entrada
  // Sem categoria: só soma em Desejos.
  assert.equal(withBoughtWishes(groups, [{ status: "BOUGHT", actualAmount: 100, estimatedAmount: 100, categoryId: null }])[1].spent, 100)
})

test("semana estourada: selo vermelho, ideal do dia é não gastar", () => {
  assert.equal(isWeekExceeded({ available: -90.87, spentThisWeek: 709.2, limit: 618.33 }), true)
  assert.equal(isWeekExceeded({ available: 0, spentThisWeek: 618.33, limit: 618.33 }), true)
  assert.equal(isWeekExceeded({ available: 0, spentThisWeek: 0, limit: 0 }), false)
  assert.equal(isWeekExceeded({ available: 10, spentThisWeek: 600, limit: 610 }), false)
  // Zerou porque a sobra foi guardada: não é estouro.
  const saved = { amount: 46, destination: "WISH" as const, targetName: null }
  assert.equal(isWeekExceeded({ available: 0, spentThisWeek: 618.33, limit: 618.33, savedThisWeek: saved }), false)
  assert.equal(paceBadge("OVER", true).label, "Limite estourado")
  assert.equal(paceBadge("OVER").label, "Acima do ritmo")
  const fmt = (v: number) => `R$ ${v}`
  const today = { date: "2026-11-05", spent: 0, isFuture: false }
  assert.match(dayDetail(today, 88.33, fmt, 0)!, /o ideal é não gastar/)
  assert.match(dayDetail(today, 88.33, fmt, null)!, /ideal R\$ 88.33/)
})

test("carryOver: padrão MONTH e frase de cada modo", () => {
  assert.equal(mapWeek({ enabled: true }).carryOver, "MONTH")
  assert.equal(mapWeek({ enabled: true, carryOver: "WEEK" }).carryOver, "WEEK")
  assert.match(carryOverSummary("WEEK"), /mesmo limite/)
  assert.match(carryOverSummary("MONTH"), /próximas/)
})

test("sobra guardada: mapeia da API e descreve o destino", () => {
  const fmt = (v: number) => `R$ ${Math.round(v)}`
  assert.equal(mapWeekSave(null), null)
  const goal = mapWeekSave({ amount: "46.09", destination: "GOAL", targetName: "Viagem" })!
  assert.deepEqual(goal, { amount: 46.09, destination: "GOAL", targetName: "Viagem" })
  assert.equal(weekSaveLabel(goal, fmt), "R$ 46 da sobra foram para Viagem.")
  assert.equal(weekSaveLabel({ amount: 30, destination: "WISH", targetName: null }, fmt), "R$ 30 da sobra foram para os seus desejos.")
})
