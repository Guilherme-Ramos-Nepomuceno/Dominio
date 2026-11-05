// Contas a pagar/receber: agrupamento por prazo e o resumo do topo.
// Lógica pura — sem aliases "@/" — para rodar no test runner do Node.

import { dayKey } from "./home.ts"

export type PendingBucket = "overdue" | "today" | "tomorrow" | "soon" | "later"

export const PENDING_BUCKET_LABEL: Record<PendingBucket, string> = {
  overdue: "Atrasadas",
  today: "Vencem hoje",
  tomorrow: "Vencem amanhã",
  soon: "Próximos 7 dias",
  later: "Mais pra frente",
}

const ORDER: PendingBucket[] = ["overdue", "today", "tomorrow", "soon", "later"]
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]

function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((toDate(toISO).getTime() - toDate(fromISO).getTime()) / 86_400_000)
}

export function pendingBucket(date: string, todayISO: string): PendingBucket {
  const diff = daysBetween(todayISO, dayKey(date))
  if (diff < 0) return "overdue"
  if (diff === 0) return "today"
  if (diff === 1) return "tomorrow"
  if (diff <= 7) return "soon"
  return "later"
}

// "há 3 dias", "hoje", "amanhã", "qua, 12 nov".
export function pendingDueLabel(date: string, todayISO: string): string {
  const key = dayKey(date)
  const diff = daysBetween(todayISO, key)
  if (diff === 0) return "hoje"
  if (diff === 1) return "amanhã"
  if (diff === -1) return "venceu ontem"
  if (diff < 0) return `venceu há ${-diff} dias`
  const d = toDate(key)
  return `${WEEKDAYS_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export interface PendingGroup<T> {
  bucket: PendingBucket
  label: string
  total: number
  items: T[]
}

interface PendingLike {
  date: string
  amount: number
  type: string
}

// Grupos na ordem do prazo, itens do mais antigo ao mais novo; o total do
// grupo soma só o que sai (despesas), que é o que pesa no bolso.
export function groupPending<T extends PendingLike>(items: T[], todayISO: string): PendingGroup<T>[] {
  const sorted = items.slice().sort((a, b) => dayKey(a.date).localeCompare(dayKey(b.date)))
  const byBucket = new Map<PendingBucket, T[]>()
  for (const item of sorted) {
    const bucket = pendingBucket(item.date, todayISO)
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), item])
  }
  return ORDER.filter((b) => byBucket.has(b)).map((bucket) => {
    const list = byBucket.get(bucket)!
    return {
      bucket,
      label: PENDING_BUCKET_LABEL[bucket],
      total: list.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0),
      items: list,
    }
  })
}

export interface PendingSummary {
  toPay: number
  toReceive: number
  overdueCount: number
  overdueAmount: number
}

export function pendingSummary<T extends PendingLike>(items: T[], todayISO: string): PendingSummary {
  const summary: PendingSummary = { toPay: 0, toReceive: 0, overdueCount: 0, overdueAmount: 0 }
  for (const t of items) {
    if (t.type === "expense") summary.toPay += t.amount
    else summary.toReceive += t.amount
    if (pendingBucket(t.date, todayISO) === "overdue") {
      summary.overdueCount += 1
      if (t.type === "expense") summary.overdueAmount += t.amount
    }
  }
  return summary
}
