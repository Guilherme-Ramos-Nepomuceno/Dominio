import { test } from "node:test"
import assert from "node:assert/strict"
import { DOMAIN_INVALIDATES, rootsToInvalidate } from "../cache-domains.ts"

test("rootsToInvalidate: aviso sem domínio invalida tudo", () => {
  assert.equal(rootsToInvalidate(undefined), "all")
  assert.equal(rootsToInvalidate([]), "all")
})

test("rootsToInvalidate: lançar um gasto não rebusca categorias, cartões, reservas, objetivos, configurações nem regras", () => {
  const roots = rootsToInvalidate(["transactions"])
  assert.notEqual(roots, "all")
  const set = roots as Set<string>
  for (const root of ["transactions", "inbox", "plan", "invoice", "month-data"]) assert.ok(set.has(root), root)
  for (const root of ["categories", "cards", "savings", "goals", "settings", "rules"]) assert.ok(!set.has(root), root)
})

test("rootsToInvalidate: editar uma linha da revisão do banco só mexe na fila do banco", () => {
  assert.deepEqual([...(rootsToInvalidate(["pluggy-review"]) as Set<string>)], ["pluggy"])
})

test("rootsToInvalidate: vários domínios somam as raízes", () => {
  const set = rootsToInvalidate(["goals", "settings"]) as Set<string>
  for (const root of ["goals", "savings", "plan", "settings", "month-data", "invoice"]) assert.ok(set.has(root), root)
  assert.ok(!set.has("transactions"))
})

test("DOMAIN_INVALIDATES: todo domínio invalida ao menos a própria raiz de dados", () => {
  const own: Record<string, string> = {
    transactions: "transactions",
    categories: "categories",
    cards: "cards",
    savings: "savings",
    goals: "goals",
    settings: "settings",
    plan: "plan",
    rules: "rules",
    pluggy: "pluggy",
    "pluggy-review": "pluggy",
    family: "family",
  }
  for (const [domain, roots] of Object.entries(DOMAIN_INVALIDATES)) {
    assert.ok((roots as string[]).includes(own[domain]), domain)
  }
})

test("DOMAIN_INVALIDATES: o que muda dinheiro (lançamentos, banco, reservas, cartões, categorias) atualiza os totais do mês", () => {
  for (const domain of ["transactions", "pluggy", "savings", "cards", "categories"] as const) {
    assert.ok(DOMAIN_INVALIDATES[domain].includes("month-data"), domain)
    assert.ok(DOMAIN_INVALIDATES[domain].includes("plan"), domain)
  }
})
