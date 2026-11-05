// Divisão das contas fixas do casal: quanto cada um deveria pagar, quanto
// fica livre para cada um e o acerto entre os dois no mês. Lógica pura — sem
// aliases "@/" — para rodar no test runner do Node.

export type CoupleSplitMode = "TOGETHER" | "PROPORTIONAL" | "HALF"

export const SPLIT_MODE_LABEL: Record<CoupleSplitMode, string> = {
  TOGETHER: "Tudo junto",
  PROPORTIONAL: "Proporcional ao salário",
  HALF: "Meio a meio",
}

export const SPLIT_MODE_HINT: Record<CoupleSplitMode, string> = {
  TOGETHER: "A renda dos dois paga as contas e o que sobra é dividido igual",
  PROPORTIONAL: "Cada um paga a parte da sua renda e o que sobra é seu",
  HALF: "Cada um paga metade e o que sobra é seu",
}

// Abaixo disso o acerto é "tudo certo" (centavos de arredondamento).
export const MIN_SETTLEMENT = 1

export interface SplitTransaction {
  id: string
  type: string // "income" | "expense"
  amount: number
  date: string
  status?: string // "paid" | "pending" | "cancelled"
  isCasal?: boolean
  recurrence?: string | null
  installments?: number | null
  categoryName?: string | null
  ownerId: string | null // null = lançada direto na conta do casal
  paidByUserId?: string | null
}

export interface MonthInputs {
  income: Record<string, number>
  incomeExpected: Record<string, boolean> // ainda tem receita só agendada no mês
  sharedTotal: number
  paid: Record<string, number>
  // Agendadas: contas do casal ainda não pagas na conta de cada um — quem vai
  // pagar é o dono, então já contam para ele no acerto.
  scheduled: Record<string, number>
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Fixa = se repete todo mês ou é parcelada.
export function isFixedExpense(t: Pick<SplitTransaction, "recurrence" | "installments">): boolean {
  return (!!t.recurrence && t.recurrence !== "none") || (t.installments ?? 1) > 1
}

const isTransfer = (name: string | null | undefined) => !!name && name.startsWith("Transferência")

// Junta o que entra na divisão de um mês: renda líquida de cada um (sem
// transferências), contas fixas do casal e quanto cada um já pagou delas.
export function coupleMonthInputs(
  transactions: SplitTransaction[],
  personIds: string[],
  inMonth: (date: string) => boolean,
): MonthInputs {
  const income: Record<string, number> = Object.fromEntries(personIds.map((id) => [id, 0]))
  const incomeExpected: Record<string, boolean> = Object.fromEntries(personIds.map((id) => [id, false]))
  const paid: Record<string, number> = Object.fromEntries(personIds.map((id) => [id, 0]))
  const scheduled: Record<string, number> = Object.fromEntries(personIds.map((id) => [id, 0]))
  let sharedTotal = 0

  for (const t of transactions) {
    if (t.status === "cancelled" || !inMonth(t.date)) continue

    if (t.type === "income") {
      if (!t.ownerId || !(t.ownerId in income) || isTransfer(t.categoryName)) continue
      income[t.ownerId] += t.amount
      if (t.status !== "paid") incomeExpected[t.ownerId] = true
      continue
    }

    const shared = t.ownerId === null || !!t.isCasal
    if (t.type !== "expense" || !shared || !isFixedExpense(t) || isTransfer(t.categoryName)) continue
    sharedTotal += t.amount
    if (t.status === "paid") {
      const payer = t.paidByUserId ?? t.ownerId
      if (payer && payer in paid) paid[payer] += t.amount
    } else if (t.ownerId && t.ownerId in scheduled) {
      scheduled[t.ownerId] += t.amount
    }
  }

  return {
    income: mapValues(income, round2),
    incomeExpected,
    sharedTotal: round2(sharedTotal),
    paid: mapValues(paid, round2),
    scheduled: mapValues(scheduled, round2),
  }
}

function mapValues(record: Record<string, number>, fn: (n: number) => number): Record<string, number> {
  return Object.fromEntries(Object.entries(record).map(([k, v]) => [k, fn(v)]))
}

export interface SplitPerson {
  id: string
  income: number
  paid: number
  scheduled?: number
}

export interface SplitRow {
  id: string
  income: number
  share: number // quanto deveria pôr nas contas fixas do casal
  sharePct: number // 0–100, da soma das contas (no Tudo junto pode passar de 100)
  paid: number
  scheduled: number
  free: number // quanto fica livre depois da sua parte
  balance: number // > 0: passa esse valor para o outro; < 0: recebe
}

export interface Transfer {
  fromId: string
  toId: string
  amount: number
}

export interface CoupleSplit {
  rows: SplitRow[]
  sharedTotal: number
  transfer: Transfer | null // acerto do mês, sem contar o que já foi acertado
}

export function computeCoupleSplit(mode: CoupleSplitMode, people: [SplitPerson, SplitPerson], sharedTotal: number): CoupleSplit {
  const totalIncome = people[0].income + people[1].income

  const free = people.map((p) => {
    if (mode === "TOGETHER") return (totalIncome - sharedTotal) / 2
    if (mode === "HALF") return p.income - sharedTotal / 2
    // Proporcional: sem renda nenhuma no mês, cai para meio a meio.
    const ratio = totalIncome > 0 ? p.income / totalIncome : 0.5
    return p.income - sharedTotal * ratio
  })

  const rows: SplitRow[] = people.map((p, i) => {
    const share = p.income - free[i]
    return {
      id: p.id,
      income: round2(p.income),
      share: round2(share),
      sharePct: sharedTotal > 0 ? Math.round((share / sharedTotal) * 100) : 0,
      paid: round2(p.paid),
      scheduled: round2(p.scheduled ?? 0),
      free: round2(free[i]),
      balance: round2(p.income - p.paid - (p.scheduled ?? 0) - free[i]),
    }
  })

  const payer = rows.find((r) => r.balance >= MIN_SETTLEMENT)
  const receiver = rows.find((r) => r !== payer)
  const transfer = payer && receiver ? { fromId: payer.id, toId: receiver.id, amount: payer.balance } : null

  return { rows, sharedTotal: round2(sharedTotal), transfer }
}

export interface SettlementRecord {
  fromUserId: string
  toUserId: string
  amount: number
}

export interface SettlementStatus {
  settled: Transfer | null // o que já foi passado, líquido
  remaining: Transfer | null // o que ainda falta (pode inverter: "devolve")
}

// Desconta do acerto do mês o que já foi registrado como acertado. Se um
// imprevisto aumentar o acerto, sobra a diferença; se diminuir, quem recebeu
// devolve.
export function applySettlements(transfer: Transfer | null, people: [string, string], records: SettlementRecord[]): SettlementStatus {
  const [a, b] = people
  // Fluxo líquido de a para b: o que já foi e o que deveria ir.
  const settledAB = records.reduce((sum, r) => sum + (r.fromUserId === a && r.toUserId === b ? r.amount : r.fromUserId === b && r.toUserId === a ? -r.amount : 0), 0)
  const dueAB = transfer ? (transfer.fromId === a ? transfer.amount : -transfer.amount) : 0

  const asTransfer = (ab: number): Transfer | null => {
    const amount = round2(Math.abs(ab))
    if (amount < MIN_SETTLEMENT) return null
    return ab > 0 ? { fromId: a, toId: b, amount } : { fromId: b, toId: a, amount }
  }

  return { settled: asTransfer(settledAB), remaining: asTransfer(dueAB - settledAB) }
}
