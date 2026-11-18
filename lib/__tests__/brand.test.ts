import { test } from "node:test"
import assert from "node:assert/strict"
import { BRAND_ACHIEVEMENT, BRAND_ICON_VERSION, brandIconUrl, monthClosedToast } from "../brand.ts"

const money = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`

test("monthClosedToast: com sobra, fecha no azul com a conquista", () => {
  const t = monthClosedToast("Novembro", 240, money)
  assert.equal(t.title, "Novembro fechou no azul")
  assert.equal(t.description, `Sobraram R$ 240,00. ${BRAND_ACHIEVEMENT}`)
})

test("monthClosedToast: no limite exato ainda é no azul", () => {
  const t = monthClosedToast("Novembro", 0, money)
  assert.equal(t.title, "Novembro fechou no azul")
  assert.equal(t.description, `Fechou no limite. ${BRAND_ACHIEVEMENT}`)
})

test("monthClosedToast: estourado fica neutro e sem a conquista", () => {
  const t = monthClosedToast("Novembro", -180, money)
  assert.equal(t.title, "Novembro fechado")
  assert.equal(t.description, "Passou R$ 180,00 do plano. O próximo mês começa do zero.")
  assert.ok(!t.description.includes(BRAND_ACHIEVEMENT))
})

test("monthClosedToast: centavo de arredondamento não vira estouro", () => {
  assert.equal(monthClosedToast("Novembro", -0.001, money).title, "Novembro fechou no azul")
})

test("brandIconUrl: põe a versão do ícone no endereço", () => {
  assert.equal(brandIconUrl("/favicon.ico"), `/favicon.ico?v=${BRAND_ICON_VERSION}`)
})
