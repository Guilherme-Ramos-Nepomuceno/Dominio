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

test("chave do grupo: tipo + merchantKey, ou o id do lançamento", () => {
  assert.equal(inboxGroupKey(group("ifood", "iFood", null, ["expense"])), "expense:ifood")
  // Mesmo estabelecimento, grupo de estorno (receita) separado.
  assert.equal(inboxGroupKey(group("ifood", "iFood", null, ["income"])), "income:ifood")
  // Sem merchantKey, rótulos repetidos não colidem.
  assert.notEqual(inboxGroupKey(group(null, "Pix", null, ["expense"])), inboxGroupKey(group(null, "Pix2", null, ["expense"])))
  assert.equal(inboxGroupKey(group(null, "Pix", null, ["expense"])), "tx:Pix-0")
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
  assert.deepEqual(initialSelections(groups, categories), { "expense:ifood": "food", "expense:x": null, "tx:Y-0": null })
})

test("aceitar todas só considera sugestões válidas e do tipo do grupo", () => {
  const groups = [
    group("ifood", "iFood", "food", ["expense"]),
    group(null, "Y", null, ["expense"]),
    group("z", "Z", "food", []),
    // Estorno (receita) com sugestão de categoria de despesa: fica de fora.
    group("ifood", "Estorno iFood", "food", ["income"]),
  ]
  assert.deepEqual(groupsWithSuggestion(groups, categories).map((g) => g.label), ["iFood"])
  assert.deepEqual(initialSelections([groups[3]], categories), { "income:ifood": null })
})
