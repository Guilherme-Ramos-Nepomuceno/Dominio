import { test } from "node:test"
import assert from "node:assert/strict"
import { inboxGroupKey, inboxGroupType, initialSelections, groupsWithSuggestion, selectableCategories } from "../inbox.ts"
import type { Category } from "../types.ts"

const categories: Category[] = [
  { id: "food", name: "Alimentação", color: "#f00", type: "expense" },
  { id: "salary", name: "Salário", color: "#0f0", type: "income" },
]

const group = (merchantKey: string | null, label: string, suggestion: string | null, types: Array<"income" | "expense">) => ({
  merchantKey,
  label,
  suggestion: suggestion ? { categoryId: suggestion } : null,
  transactions: types.map((type, i) => ({ id: `${label}-${i}`, type })),
})

test("chave do grupo usa merchantKey ou o rótulo", () => {
  assert.equal(inboxGroupKey({ merchantKey: "ifood", label: "iFood" }), "ifood")
  assert.equal(inboxGroupKey({ merchantKey: null, label: "Outros" }), "label:Outros")
})

test("tipo do grupo pela maioria", () => {
  assert.equal(inboxGroupType(group(null, "a", null, ["expense", "expense", "income"])), "expense")
  assert.equal(inboxGroupType(group(null, "a", null, ["income"])), "income")
  assert.equal(inboxGroupType(group(null, "a", null, ["income", "expense"])), null)
  assert.deepEqual(selectableCategories(categories, null).length, 2)
  assert.deepEqual(selectableCategories(categories, "income").map((c) => c.id), ["salary"])
})

test("seleção inicial vem da sugestão válida", () => {
  const groups = [group("ifood", "iFood", "food", ["expense"]), group("x", "X", "apagada", ["expense"]), group(null, "Y", null, ["expense"])]
  assert.deepEqual(initialSelections(groups, categories), { ifood: "food", x: null, "label:Y": null })
})

test("aceitar todas só considera grupos com sugestão", () => {
  const groups = [group("ifood", "iFood", "food", ["expense"]), group(null, "Y", null, ["expense"]), group("z", "Z", "food", [])]
  assert.deepEqual(groupsWithSuggestion(groups).map((g) => g.label), ["iFood"])
})
