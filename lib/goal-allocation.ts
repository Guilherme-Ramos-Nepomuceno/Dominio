// Regras puras de reservas e objetivos (ver ADR-031). Sem React e sem API,
// para ter teste de verdade (lib/__tests__/goal-allocation.test.ts).

export const SAVINGS_KINDS = [
  { value: "EMERGENCIA", label: "Emergência" },
  { value: "VIAGEM", label: "Viagem" },
  { value: "CURTO_PRAZO", label: "Curto prazo" },
  { value: "LONGO_PRAZO", label: "Longo prazo" },
  { value: "OUTRO", label: "Outra" },
] as const

export type SavingsKind = (typeof SAVINGS_KINDS)[number]["value"]

export function savingsKindLabel(kind: string | null | undefined): string {
  return SAVINGS_KINDS.find((k) => k.value === kind)?.label ?? "Outra"
}

// Quanto de uma reserva o objetivo já recebeu dela.
export interface AllocationRef {
  goalId: string
  goalName: string
  amount: number
}

// Saldo da reserva que ainda não foi separado para nenhum objetivo.
// Nunca negativo: se o saldo caiu (sync do banco) abaixo do separado, o livre é zero.
export function freeOfSavings(savings: { currentAmount: number; allocatedTo?: AllocationRef[] }): number {
  const allocated = sumCents(savings.allocatedTo ?? [])
  return Math.max(0, toCents(savings.currentAmount) - toCents(allocated)) / 100
}

// Quanto este objetivo recebe da reserva, ou zero.
export function allocationFor(savings: { allocatedTo?: AllocationRef[] }, goalId: string): number {
  return savings.allocatedTo?.find((a) => a.goalId === goalId)?.amount ?? 0
}

// Quanto da reserva está disponível para este objetivo: o livre mais o que
// ele já tem nela (é o que aparece ao editar a separação).
export function availableForGoal(savings: { currentAmount: number; allocatedTo?: AllocationRef[] }, goalId: string): number {
  return freeOfSavings(savings) + allocationFor(savings, goalId)
}

// Porcentagem do objetivo (pode passar de 100; a barra corta em 100).
export function goalProgress(saved: number, target: number): number {
  if (target <= 0) return 0
  return (saved / target) * 100
}

// Valor digitado (já convertido para número) passa pela mesma régua da API:
// centavos, positivo ou zero (zero tira a separação).
export function validateAllocationAmount(amount: number, available: number): string | null {
  if (!Number.isFinite(amount) || amount < 0) return "Informe um valor válido"
  if (amount > available + 0.000001) return "Passa do que está livre nessa reserva"
  return null
}

function toCents(value: number): number {
  return Math.round(value * 100)
}

function sumCents(rows: { amount: number }[]): number {
  return rows.reduce((total, row) => total + toCents(row.amount), 0) / 100
}
