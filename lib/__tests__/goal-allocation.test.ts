import { test } from "node:test"
import assert from "node:assert/strict"
import { allocationFor, availableForGoal, freeOfSavings, goalProgress, savingsKindLabel, validateAllocationAmount } from "../goal-allocation.ts"

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

test("rótulo do tipo de reserva, com 'Outra' para valor desconhecido", () => {
  assert.equal(savingsKindLabel("VIAGEM"), "Viagem")
  assert.equal(savingsKindLabel(undefined), "Outra")
  assert.equal(savingsKindLabel("QUALQUER"), "Outra")
})
