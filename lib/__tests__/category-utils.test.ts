import { test } from "node:test"
import assert from "node:assert/strict"
import {
  effectiveTransactionType,
  categoryKeyOf,
  transactionCategoryLabel,
  UNCATEGORIZED_KEY,
  UNCATEGORIZED_LABEL,
  transactionCountLabel,
} from "../category-utils.ts"
import type { Category } from "../types.ts"

const categories: Category[] = [{ id: "food", name: "Alimentação", color: "#f00", type: "expense" }]

test("sem categoria usa o tipo da própria transação", () => {
  assert.equal(effectiveTransactionType(categories, { categoryId: null, type: "income" }), "income")
  assert.equal(effectiveTransactionType(categories, { categoryId: null, type: "expense" }), "expense")
})

test("com categoria usa o tipo da categoria; categoria ainda não carregada fica indefinida", () => {
  assert.equal(effectiveTransactionType(categories, { categoryId: "food", type: "income" }), "expense")
  assert.equal(effectiveTransactionType([], { categoryId: "food", type: "expense" }), undefined)
})

test("chave e rótulo de agrupamento", () => {
  assert.equal(categoryKeyOf({ categoryId: null }), UNCATEGORIZED_KEY)
  assert.equal(categoryKeyOf({ categoryId: "food" }), "food")
  assert.equal(transactionCategoryLabel(categories, { categoryId: null }), UNCATEGORIZED_LABEL)
  assert.equal(transactionCategoryLabel(categories, { categoryId: "food" }), "Alimentação")
  assert.equal(transactionCategoryLabel([], { categoryId: "food" }), "")
})

test("transactionCountLabel: singular e plural", () => {
  assert.equal(transactionCountLabel(1), "1 transação")
  assert.equal(transactionCountLabel(0), "0 transações")
  assert.equal(transactionCountLabel(3), "3 transações")
})

test("ícone sugerido pelo nome da categoria", async () => {
  const { suggestCategoryIcon } = await import("../category-utils.ts")
  assert.equal(suggestCategoryIcon("Mercado"), "ShoppingCart")
  assert.equal(suggestCategoryIcon("Academia"), "Barbell")
  assert.equal(suggestCategoryIcon("Ônibus"), "Bus")
  assert.equal(suggestCategoryIcon("Salário"), "Money")
  assert.equal(suggestCategoryIcon("Xyz"), null)
  assert.equal(suggestCategoryIcon(""), null)
})
