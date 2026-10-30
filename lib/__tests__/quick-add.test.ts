import { test } from "node:test"
import assert from "node:assert/strict"
import {
  applyKeypadKey,
  formatCentsBRL,
  centsToAmount,
  amountToCents,
  buildCategoryChips,
  toggleChip,
  buildMoreOptionsQuery,
  parseNewTransactionPrefill,
  defaultDescription,
  MAX_AMOUNT_DIGITS,
} from "../quick-add.ts"
import type { Category } from "../types.ts"

test("teclado empurra dígitos como calculadora de caixa", () => {
  let cents = 0
  for (const k of ["1", "2", "3", "4"] as const) cents = applyKeypadKey(cents, k)
  assert.equal(cents, 1234)
  assert.equal(formatCentsBRL(cents), "R$ 12,34")
  cents = applyKeypadKey(cents, "00")
  assert.equal(formatCentsBRL(cents), "R$ 1.234,00")
  cents = applyKeypadKey(cents, "backspace")
  assert.equal(cents, 12340)
  assert.equal(applyKeypadKey(cents, "clear"), 0)
})

test("zeros à esquerda são ignorados e há limite de dígitos", () => {
  assert.equal(applyKeypadKey(0, "0"), 0)
  assert.equal(applyKeypadKey(0, "00"), 0)
  const max = Number("9".repeat(MAX_AMOUNT_DIGITS))
  assert.equal(applyKeypadKey(max, "1"), max)
  assert.equal(applyKeypadKey(0, "backspace"), 0)
})

test("formatação BRL", () => {
  assert.equal(formatCentsBRL(0), "R$ 0,00")
  assert.equal(formatCentsBRL(5), "R$ 0,05")
  assert.equal(formatCentsBRL(123456789), "R$ 1.234.567,89")
  assert.equal(centsToAmount(1999), 19.99)
  assert.equal(amountToCents(19.99), 1999)
  assert.equal(amountToCents(-1), 0)
})

const cat = (id: string, type: "income" | "expense", extra: Partial<Category> = {}): Category => ({
  id,
  name: id.toUpperCase(),
  color: "#000",
  type,
  ...extra,
})

test("chips: sugestão primeiro, depois frequentes, sem repetir, só do tipo", () => {
  const categories = [cat("a", "expense"), cat("b", "expense"), cat("c", "expense"), cat("d", "expense"), cat("e", "expense"), cat("s", "income")]
  const chips = buildCategoryChips(categories, "expense", { categoryId: "c" }, ["a", "c", "s", "x"], null)
  assert.deepEqual(chips.map((c) => c.id), ["c", "a", "b", "d"])
})

test("chips: categoria selecionada sempre aparece e transferências ficam de fora", () => {
  const categories = [cat("t", "expense", { excludedFromTotals: true }), cat("a", "expense"), cat("b", "expense")]
  const chips = buildCategoryChips(categories, "expense", null, ["t"], "b", 4)
  assert.deepEqual(chips.map((c) => c.id), ["b", "a"])
})

test("toque no chip seleciona, segundo toque desmarca", () => {
  assert.equal(toggleChip(null, "a"), "a")
  assert.equal(toggleChip("a", "a"), null)
  assert.equal(toggleChip("a", "b"), "b")
})

test("Mais opções leva o rascunho para /new e volta igual", () => {
  const query = buildMoreOptionsQuery({
    type: "expense",
    cents: 4590,
    description: "  Padaria  ",
    cardId: "card-1",
    date: "2026-10-30",
    categoryId: null,
  })
  const prefill = parseNewTransactionPrefill(new URLSearchParams(query))
  assert.deepEqual(prefill, { type: "expense", amount: 45.9, description: "Padaria", cardId: "card-1", date: "2026-10-30" })
})

test("prefill ignora valores inválidos", () => {
  const prefill = parseNewTransactionPrefill(new URLSearchParams("type=foo&amount=-3&date=30/10/2026"))
  assert.deepEqual(prefill, {})
})

test("descrição padrão", () => {
  assert.equal(defaultDescription("expense"), "Despesa")
  assert.equal(defaultDescription("income"), "Receita")
  assert.equal(defaultDescription("expense", "Mercado"), "Mercado")
})
