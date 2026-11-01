// Onboarding pós-cadastro (renda prevista → rascunho do plano → 1 desejo →
// Home). Lógica pura e chaves de armazenamento — testável com node:test.

export const ONBOARDING_STEPS = ["income", "plan", "wish"] as const
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export function onboardingPendingKey(userId: string): string {
  return `dominio:onboarding-pending:${userId}`
}

export function onboardingDoneKey(userId: string): string {
  return `dominio:onboarding-done:${userId}`
}

export function nextOnboardingStep(step: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(step)
  return ONBOARDING_STEPS[index + 1] ?? null
}

export interface OnboardingSignals {
  // Acabou de se cadastrar (flag local gravada no registro).
  pending: boolean
  // Já concluiu ou pulou.
  done: boolean
  // Conta pessoal (onboarding não roda na do casal nem vendo parceiro).
  isPersonal: boolean
  planStatus: "NONE" | "DRAFT" | "CONFIRMED" | "CLOSED" | null
  transactionCount: number | null
}

// "redirect": cadastro recém-feito → vai direto ao onboarding.
// "card": conta que parece nova (sem plano e sem transações) → convite na Home.
export function onboardingAction(s: OnboardingSignals): "redirect" | "card" | "none" {
  if (!s.isPersonal || s.done) return "none"
  if (s.pending) return "redirect"
  if (s.planStatus === "NONE" && s.transactionCount === 0) return "card"
  return "none"
}
