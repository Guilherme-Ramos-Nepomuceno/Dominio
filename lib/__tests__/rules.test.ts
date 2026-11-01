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
