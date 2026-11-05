// Recorrentes: quanto cada assinatura/fixa pesa por mês e o andamento das
// parcelas. Lógica pura — sem aliases "@/" — para rodar no test runner do Node.

export type Frequency = "daily" | "weekly" | "monthly" | "yearly"

const PER_MONTH: Record<Frequency, number> = {
  daily: 365 / 12,
  weekly: 52 / 12,
  monthly: 1,
  yearly: 1 / 12,
}

// Valor equivalente por mês (semanal ≈ 4,33×; anual ÷ 12). Frequência
// desconhecida conta como mensal.
export function monthlyEquivalent(amount: number, frequency: string | null | undefined): number {
  const factor = PER_MONTH[(frequency ?? "monthly") as Frequency] ?? 1
  return amount * factor
}

export interface InstallmentProgress {
  current: number
  total: number
  left: number // parcelas que ainda vão sair, contando a próxima
  remaining: number // quanto ainda falta pagar
  pct: number // quanto já foi (0–100), contando a próxima como não paga
}

export function installmentProgress(t: { amount: number; installments?: number; currentInstallment?: number }): InstallmentProgress {
  const total = Math.max(1, t.installments || 1)
  const current = Math.min(total, Math.max(1, t.currentInstallment || 1))
  const left = total - current + 1
  return { current, total, left, remaining: t.amount * left, pct: ((current - 1) / total) * 100 }
}

interface RecurringLike {
  amount: number
  type: string
  recurrence?: string | null
}

// Resumo do topo: o que sai por mês (fixas + parcela do mês), o que entra por
// mês em recorrentes de receita, e quanto ainda falta das parcelas.
export function recurringSummary(
  recurring: RecurringLike[],
  installments: { amount: number; type: string; installments?: number; currentInstallment?: number }[],
) {
  let fixedOut = 0
  let fixedIn = 0
  for (const t of recurring) {
    const monthly = monthlyEquivalent(t.amount, t.recurrence)
    if (t.type === "income") fixedIn += monthly
    else fixedOut += monthly
  }
  let installmentsOut = 0
  let installmentsRemaining = 0
  for (const t of installments) {
    if (t.type === "income") continue
    installmentsOut += t.amount
    installmentsRemaining += installmentProgress(t).remaining
  }
  return { monthlyOut: fixedOut + installmentsOut, fixedOut, fixedIn, installmentsOut, installmentsRemaining }
}
