import { test } from "node:test"
import assert from "node:assert/strict"
import { compassDeviation, compassHeadline, sameStretch } from "../compass.ts"

const range = (y: number, m: number, endDay?: number) => ({
  start: new Date(y, m - 1, 1),
  end: new Date(y, m - 1, endDay ?? new Date(y, m, 0).getDate(), 23, 59, 59, 999),
})
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString()

test("mês em andamento compara com o mesmo trecho dos anteriores", () => {
  const stretch = sameStretch(range(2026, 10), range(2026, 11, 5))
  assert.equal(stretch.end.getDate(), 5)
  assert.equal(stretch.end.getMonth(), 9)
})

test("desvio por categoria contra a média dos meses com gasto", () => {
  const expenses = [
    // outubro e setembro: restaurante 200, mercado 600
    { key: "rest", amount: 200, date: at(2026, 10, 3) },
    { key: "merc", amount: 600, date: at(2026, 10, 4) },
    { key: "rest", amount: 200, date: at(2026, 9, 3) },
    { key: "merc", amount: 600, date: at(2026, 9, 4) },
    // fora do trecho (depois do dia 5) não entra na média
    { key: "rest", amount: 999, date: at(2026, 10, 20) },
    // novembro até o dia 5: restaurante 520, mercado 360
    { key: "rest", amount: 520, date: at(2026, 11, 2) },
    { key: "merc", amount: 360, date: at(2026, 11, 4) },
    { key: "cafe", amount: 5, date: at(2026, 11, 4) },
  ]
  // agosto sem gasto nenhum: não entra na média
  const result = compassDeviation(expenses, range(2026, 11, 5), [range(2026, 10), range(2026, 9), range(2026, 8)])
  assert.equal(result.previousMonths, 2)
  assert.deepEqual(
    result.rows.map((r) => [r.key, r.diff]),
    [["rest", 320], ["merc", -240]],
  )
  const fmt = (v: number) => `R$ ${v}`
  const name = (k: string) => ({ rest: "Restaurantes", merc: "Mercado" })[k] ?? k
  assert.equal(compassHeadline(result.rows, name, fmt), "Restaurantes é o que mais puxou para cima: +R$ 320 em relação ao seu normal.")
  assert.match(compassHeadline(result.rows.filter((r) => r.diff < 0), name, fmt), /Mercado foi o que mais caiu/)
  assert.equal(compassHeadline([], name, fmt), "Tudo perto do seu normal.")
})

test("sem histórico: nada a comparar", () => {
  const result = compassDeviation([{ key: "rest", amount: 50, date: at(2026, 11, 2) }], range(2026, 11, 5), [range(2026, 10)])
  assert.deepEqual(result, { rows: [], previousMonths: 0 })
})

test("manchete pula as chaves de skip (Sem categoria)", () => {
  const rows = [
    { key: "__none__", current: 45, normal: 0, diff: 45 },
    { key: "lazer", current: 0, normal: 78, diff: -78 },
  ]
  const text = compassHeadline(rows, (k) => (k === "lazer" ? "Lazer" : "Sem categoria"), (v) => `R$ ${v}`, ["__none__"])
  assert.equal(text, "Nada acima do seu normal. Lazer foi o que mais caiu: −R$ 78.")
})
