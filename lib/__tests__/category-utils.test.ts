import { test } from "node:test"
import assert from "node:assert/strict"
import {
  effectiveTransactionType,
  categoryKeyOf,
  transactionCategoryLabel,
  UNCATEGORIZED_KEY,
  UNCATEGORIZED_LABEL,
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
