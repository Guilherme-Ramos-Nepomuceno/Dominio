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
} from "../week.ts"
import {
  mapClosingData,
  defaultDecisions,
  postponeWarning,
  validateLeftover,
  buildCloseBody,
  adherenceTone,
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
  assert.deepEqual(mapNotificationPrefs({ weekly80: false }), { weekStart: true, weekly80: false, monthPlan: true })
})
