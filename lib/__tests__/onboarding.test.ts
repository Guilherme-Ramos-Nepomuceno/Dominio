import { test } from "node:test"
import assert from "node:assert/strict"
import { onboardingAction, nextOnboardingStep, onboardingDoneKey } from "../onboarding.ts"

const base = { pending: false, done: false, isPersonal: true, planStatus: null, transactionCount: null } as const

test("cadastro recém-feito vai direto para o onboarding", () => {
  assert.equal(onboardingAction({ ...base, pending: true }), "redirect")
})

test("conta nova sem plano e sem transações ganha o convite na Home", () => {
  assert.equal(onboardingAction({ ...base, planStatus: "NONE", transactionCount: 0 }), "card")
  assert.equal(onboardingAction({ ...base, planStatus: "NONE", transactionCount: 3 }), "none")
  assert.equal(onboardingAction({ ...base, planStatus: "DRAFT", transactionCount: 0 }), "none")
})

test("concluído/pulado ou fora da conta pessoal não mostra nada", () => {
  assert.equal(onboardingAction({ ...base, pending: true, done: true }), "none")
  assert.equal(onboardingAction({ ...base, pending: true, isPersonal: false }), "none")
})

test("passos em ordem", () => {
  assert.equal(nextOnboardingStep("income"), "plan")
  assert.equal(nextOnboardingStep("plan"), "wish")
  assert.equal(nextOnboardingStep("wish"), null)
  assert.equal(onboardingDoneKey("u1"), "dominio:onboarding-done:u1")
})
