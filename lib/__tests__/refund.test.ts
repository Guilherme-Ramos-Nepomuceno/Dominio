import { test } from "node:test"
import assert from "node:assert/strict"
import { asSpending, spendingType, transactionCategoryLabel } from "../category-utils.ts"
import type { Category } from "../types.ts"

const categories: Category[] = [
  { id: "lazer", name: "Lazer", color: "#a78bfa", type: "expense" },
  { id: "est", name: "Estorno", color: "#14b8a6", type: "income", isRefund: true },
  { id: "sal", name: "Salário", color: "#4ade80", type: "income" },
]

const purchase = { categoryId: "lazer", type: "expense" as const, amount: 167.28 }
const refund = { categoryId: "est", type: "income" as const, amount: 100, refundCategoryId: "lazer" }
const orphan = { categoryId: "est", type: "income" as const, amount: 40, refundCategoryId: null }
const salary = { categoryId: "sal", type: "income" as const, amount: 5000 }

test("estorno vira despesa negativa na categoria da compra", () => {
  assert.deepEqual(asSpending(categories, refund), { categoryId: "lazer", type: "expense", amount: -100, refundCategoryId: null })
})

test("estorno sem compra fica no próprio Estorno, negativo, e não conta como receita", () => {
  const view = asSpending(categories, orphan)
  assert.equal(view.amount, -40)
  assert.equal(spendingType(categories, view), "expense")
})

test("despesa e receita do mês: estorno desconta da despesa e fica fora da receita", () => {
  const all = [purchase, refund, orphan, salary].map((t) => asSpending(categories, t))
  const sum = (type: string) => all.filter((t) => spendingType(categories, t) === type).reduce((s, t) => s + t.amount, 0)
  assert.equal(Math.round(sum("expense") * 100) / 100, 27.28)
  assert.equal(sum("income"), 5000)
})

test("lançamento comum passa igual", () => {
  assert.equal(asSpending(categories, purchase), purchase)
})

test("rótulo mostra de onde o estorno desconta", () => {
  assert.equal(transactionCategoryLabel(categories, refund), "Estorno · Lazer")
  assert.equal(transactionCategoryLabel(categories, orphan), "Estorno")
})
