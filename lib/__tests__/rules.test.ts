import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mapRule,
  mapRuleSuggestion,
  mapRuleConflict,
  mapPluggyCategoryMap,
  isAutoCategorized,
  autoCategorizedLabel,
  formatAmountRange,
  ruleHitsLabel,
  validateRuleForm,
} from "../rules.ts"

const fmt = (v: number) => `R$ ${v}`

test("mapeia regra, sugestão e conflito", () => {
  const rule = mapRule({ id: 1, merchantKey: "ifood", categoryId: "food", minAmount: "10.5", maxAmount: null, source: "MANUAL", hits: "3" })
  assert.deepEqual(rule, { id: "1", merchantKey: "ifood", categoryId: "food", minAmount: 10.5, maxAmount: null, source: "MANUAL", hits: 3 })
  assert.equal(mapRule({ id: "2", source: "x" }).source, "LEARNED")
  assert.deepEqual(mapRuleSuggestion({ merchantKey: "ifood", categoryId: "food", label: "iFood" }), {
    merchantKey: "ifood",
    categoryId: "food",
    label: "iFood",
  })
  assert.equal(mapRuleSuggestion(null), null)
  assert.equal(mapRuleSuggestion({ merchantKey: "x" }), null)
  assert.equal(mapRuleConflict({}), null)
  assert.equal(mapRuleConflict({ ruleId: "r", merchantKey: "m", categoryId: "c" })?.ruleId, "r")
})

test("mapa de categorias da Pluggy ordenado", () => {
  assert.deepEqual(mapPluggyCategoryMap([{ pluggyCategory: "Transporte", categoryId: null }, { pluggyCategory: "Alimentação", categoryId: "f" }, {}]), [
    { pluggyCategory: "Alimentação", categoryId: "f" },
    { pluggyCategory: "Transporte", categoryId: null },
  ])
  assert.deepEqual(mapPluggyCategoryMap(null), [])
})

test("selo automático só para categorias definidas sem a pessoa", () => {
  assert.equal(isAutoCategorized({ categoryId: "a", categorizedBy: "RULE" }), true)
  assert.equal(isAutoCategorized({ categoryId: "a", categorizedBy: "MANUAL" }), false)
  assert.equal(isAutoCategorized({ categoryId: null, categorizedBy: "PLUGGY" }), false)
  assert.equal(isAutoCategorized({ categoryId: "a", categorizedBy: null }), false)
  assert.equal(autoCategorizedLabel("PLUGGY"), "Categoria definida automaticamente pela categoria do banco")
  assert.equal(autoCategorizedLabel("MANUAL"), "")
})

test("faixa de valor, usos e validação do formulário", () => {
  assert.equal(formatAmountRange(null, null, fmt), "qualquer valor")
  assert.equal(formatAmountRange(null, 50, fmt), "até R$ 50")
  assert.equal(formatAmountRange(10, null, fmt), "a partir de R$ 10")
  assert.equal(formatAmountRange(10, 50, fmt), "R$ 10 a R$ 50")
  assert.equal(ruleHitsLabel(0), "ainda não usada")
  assert.equal(ruleHitsLabel(1), "usada 1 vez")
  assert.equal(ruleHitsLabel(7), "usada 7 vezes")
  const ok = { description: "Padaria", categoryId: "f", minAmount: null, maxAmount: null }
  assert.equal(validateRuleForm(ok, true), null)
  assert.equal(validateRuleForm({ ...ok, description: " " }, true), "Informe a descrição ou o estabelecimento.")
  assert.equal(validateRuleForm({ ...ok, description: "" }, false), null)
  assert.equal(validateRuleForm({ ...ok, categoryId: "" }, true), "Escolha a categoria.")
  assert.equal(validateRuleForm({ ...ok, minAmount: 50, maxAmount: 10 }, true), "O valor mínimo não pode ser maior que o máximo.")
})

test("agrega avisos de regra de uma mesma ação", async () => {
  const { aggregateRuleFeedback, ruleFeedbackPrompt } = await import("../rules.ts")
  const sug = (m: string, c: string) => ({ categoryId: c, suggestion: { merchantKey: m, categoryId: c, label: m.toUpperCase() }, conflict: null })
  const conf = (ruleId: string, m: string, old: string, chosen: string) => ({
    categoryId: chosen,
    suggestion: null,
    conflict: { ruleId, merchantKey: m, categoryId: old },
  })

  assert.deepEqual(ruleFeedbackPrompt(aggregateRuleFeedback([])), { kind: "none" })
  assert.equal(ruleFeedbackPrompt(aggregateRuleFeedback([sug("ifood", "food")])).kind, "single-suggestion")

  // Mesmo estabelecimento repetido conta uma vez (vale o mais recente).
  const dup = aggregateRuleFeedback([sug("ifood", "food"), sug("ifood", "fun")])
  assert.deepEqual(dup.suggestions.map((s) => s.categoryId), ["fun"])

  const many = ruleFeedbackPrompt(aggregateRuleFeedback([sug("ifood", "food"), sug("uber", "car"), sug("padaria", "food")]))
  assert.equal(many.kind, "batch")
  assert.equal(many.kind === "batch" && many.title, "Criar regras para 3 comerciantes?")

  const one = ruleFeedbackPrompt(aggregateRuleFeedback([conf("r1", "posto", "car", "food")]))
  assert.equal(one.kind, "single-conflict")
  assert.equal(one.kind === "single-conflict" && one.conflict.newCategoryId, "food")

  const conflicts = ruleFeedbackPrompt(aggregateRuleFeedback([conf("r1", "posto", "car", "food"), conf("r2", "uber", "car", "fun"), conf("r1", "posto", "car", "fun")]))
  assert.equal(conflicts.kind === "batch" && conflicts.title, "Atualizar 2 regras?")
  assert.deepEqual(conflicts.kind === "batch" && conflicts.feedback.conflicts.map((c) => [c.ruleId, c.newCategoryId]), [["r1", "fun"], ["r2", "fun"]])

  // Conflito "para a mesma categoria" é ignorado; sugestão do mesmo estabelecimento do conflito sai.
  const mixed = aggregateRuleFeedback([conf("r1", "posto", "car", "car"), sug("uber", "car"), conf("r2", "uber", "car", "fun"), sug("ifood", "food")])
  assert.deepEqual(mixed.conflicts.map((c) => c.ruleId), ["r2"])
  assert.deepEqual(mixed.suggestions.map((s) => s.merchantKey), ["ifood"])
  const p = ruleFeedbackPrompt(mixed)
  assert.equal(p.kind === "batch" && p.title, "Revisar regras de 2 comerciantes?")
})
