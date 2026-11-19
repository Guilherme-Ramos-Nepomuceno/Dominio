import { test } from "node:test"
import assert from "node:assert/strict"
import {
  allocationFor,
  availableForGoal,
  freeOfSavings,
  goalProgress,
  groupSavingsByKind,
  normalizeSavingsKind,
  savingsKindLabel,
  suggestSavingsKind,
  validateAllocationAmount,
} from "../goal-allocation.ts"

const emergencia = {
  currentAmount: 1000,
  allocatedTo: [
    { goalId: "viagem", goalName: "Viagem", amount: 300 },
    { goalId: "carro", goalName: "Carro", amount: 200.1 },
  ],
}

test("o livre da reserva é o saldo menos o separado para todos os objetivos", () => {
  assert.equal(freeOfSavings(emergencia), 499.9)
})

test("reserva sem separação inteira está livre", () => {
  assert.equal(freeOfSavings({ currentAmount: 500 }), 500)
})

test("saldo que caiu abaixo do separado não fica negativo", () => {
  assert.equal(freeOfSavings({ currentAmount: 100, allocatedTo: [{ goalId: "a", goalName: "A", amount: 250 }] }), 0)
})

test("ao editar, o objetivo pode usar o livre mais o que já tem nele", () => {
  assert.equal(availableForGoal(emergencia, "viagem"), 799.9)
  assert.equal(availableForGoal(emergencia, "novo"), 499.9)
})

test("quanto o objetivo recebe de uma reserva específica", () => {
  assert.equal(allocationFor(emergencia, "viagem"), 300)
  assert.equal(allocationFor(emergencia, "novo"), 0)
  assert.equal(allocationFor({}, "viagem"), 0)
})

test("progresso passa de 100 quando a meta foi superada e é zero sem meta", () => {
  assert.equal(goalProgress(250, 1000), 25)
  assert.equal(goalProgress(1200, 1000), 120)
  assert.equal(goalProgress(100, 0), 0)
})

test("validação do valor separado segue a régua da API", () => {
  assert.equal(validateAllocationAmount(0, 100), null)
  assert.equal(validateAllocationAmount(100, 100), null)
  assert.equal(validateAllocationAmount(100.01, 100), "Passa do que está livre nessa reserva")
  assert.equal(validateAllocationAmount(-1, 100), "Informe um valor válido")
  assert.equal(validateAllocationAmount(Number.NaN, 100), "Informe um valor válido")
})

test("rótulo do grupo, com 'Guardado' para valor desconhecido ou vazio", () => {
  assert.equal(savingsKindLabel("SEGURANCA"), "Segurança")
  assert.equal(savingsKindLabel(undefined), "Guardado")
  assert.equal(savingsKindLabel("QUALQUER"), "Guardado")
})

test("tipos antigos viram o grupo equivalente", () => {
  assert.equal(normalizeSavingsKind("EMERGENCIA"), "SEGURANCA")
  assert.equal(normalizeSavingsKind("VIAGEM"), "PLANEJADO")
  assert.equal(normalizeSavingsKind("CURTO_PRAZO"), "PLANEJADO")
  assert.equal(normalizeSavingsKind("LONGO_PRAZO"), "FUTURO")
  assert.equal(normalizeSavingsKind("OUTRO"), "GUARDADO")
  assert.equal(savingsKindLabel("VIAGEM"), "Planejado")
})

test("sugere o grupo pelo nome, sem acento e sem diferenciar maiúscula", () => {
  assert.equal(suggestSavingsKind("Reserva de Emergência"), "SEGURANCA")
  assert.equal(suggestSavingsKind("Viagem Europa"), "PLANEJADO")
  assert.equal(suggestSavingsKind("IPVA 2027"), "PLANEJADO")
  assert.equal(suggestSavingsKind("Aposentadoria"), "FUTURO")
  assert.equal(suggestSavingsKind("Caixinha da Ana"), null)
  assert.equal(suggestSavingsKind("   "), null)
  // palavra inteira: "carrossel" não é "carro"
  assert.equal(suggestSavingsKind("Carrossel"), null)
})

test("agrupa as reservas na ordem dos grupos, com subtotal, e some o grupo vazio", () => {
  const groups = groupSavingsByKind([
    { kind: "OUTRO", currentAmount: 50 },
    { kind: "EMERGENCIA", currentAmount: 1000.1 },
    { kind: "SEGURANCA", currentAmount: 200.2 },
    { kind: "FUTURO", currentAmount: 10 },
  ])
  assert.deepEqual(
    groups.map((g) => [g.kind, g.total, g.items.length]),
    [
      ["SEGURANCA", 1200.3, 2],
      ["FUTURO", 10, 1],
      ["GUARDADO", 50, 1],
    ],
  )
  assert.deepEqual(groupSavingsByKind([]), [])
})
