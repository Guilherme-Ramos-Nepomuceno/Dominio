import { test } from "node:test"
import assert from "node:assert/strict"
import {
  getPlanPeriod,
  getPlanMonthForDate,
  getCurrentPlanMonthKey,
  isInPlanMonth,
  formatPeriodRange,
  periodLabel,
  normalizeMonthStartDay,
  addMonths,
  periodDayCount,
} from "../period.ts"

test("mês civil quando começa no dia 1", () => {
  const p = getPlanPeriod(2026, 2, 1)
  assert.equal(p.startISO, "2026-02-01")
  assert.equal(p.endISO, "2026-02-28")
  assert.equal(periodDayCount(p), 28)
})

test("período do dia 5 até a véspera do dia 5 do mês seguinte", () => {
  const p = getPlanPeriod(2026, 11, 5)
  assert.equal(p.startISO, "2026-11-05")
  assert.equal(p.endISO, "2026-12-04")
  assert.equal(formatPeriodRange(p), "5 nov – 4 dez")
})

test("virada do ano", () => {
  const p = getPlanPeriod(2026, 12, 10)
  assert.equal(p.startISO, "2026-12-10")
  assert.equal(p.endISO, "2027-01-09")
})

test("clamp ao fim do mês (dia 31)", () => {
  const jan = getPlanPeriod(2026, 1, 31)
  assert.equal(jan.startISO, "2026-01-31")
  assert.equal(jan.endISO, "2026-02-27")
  const feb = getPlanPeriod(2026, 2, 31)
  assert.equal(feb.startISO, "2026-02-28")
  assert.equal(feb.endISO, "2026-03-30")
  const leap = getPlanPeriod(2028, 2, 30)
  assert.equal(leap.startISO, "2028-02-29")
  assert.equal(leap.endISO, "2028-03-29")
})

test("mês do plano de uma data", () => {
  assert.deepEqual(getPlanMonthForDate(new Date(2026, 10, 1), 5), { year: 2026, month: 10 })
  assert.deepEqual(getPlanMonthForDate(new Date(2026, 10, 5), 5), { year: 2026, month: 11 })
  assert.deepEqual(getPlanMonthForDate(new Date(2026, 0, 3), 5), { year: 2025, month: 12 })
  assert.deepEqual(getPlanMonthForDate(new Date(2026, 1, 28), 31), { year: 2026, month: 2 })
  assert.equal(getCurrentPlanMonthKey(1, new Date(2026, 10, 1)), "2026-11")
})

test("filtro por mês do plano usa a parte da data da string ISO", () => {
  assert.equal(isInPlanMonth("2026-11-04T12:00:00.000Z", "2026-10", 5), true)
  assert.equal(isInPlanMonth("2026-11-05T00:00:00.000Z", "2026-10", 5), false)
  assert.equal(isInPlanMonth("2026-11-05T00:00:00.000Z", "2026-11", 5), true)
  assert.equal(isInPlanMonth("2026-11-30", "2026-11", 1), true)
  assert.equal(isInPlanMonth("", "2026-11", 1), false)
})

test("rótulo do intervalo só quando o mês não é civil", () => {
  assert.equal(periodLabel("2026-11", 1), null)
  assert.equal(periodLabel("2026-11", 5), "5 nov – 4 dez")
})

test("normaliza o dia de início", () => {
  assert.equal(normalizeMonthStartDay(undefined), 1)
  assert.equal(normalizeMonthStartDay(0), 1)
  assert.equal(normalizeMonthStartDay(40), 31)
  assert.equal(normalizeMonthStartDay("15"), 15)
  assert.deepEqual(addMonths(2026, 1, -1), { year: 2025, month: 12 })
  assert.deepEqual(addMonths(2026, 12, 1), { year: 2027, month: 1 })
})
