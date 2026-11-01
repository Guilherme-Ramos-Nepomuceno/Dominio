// "Minha semana": tipos do contrato (GET /plans/:year/:month/week), mapeamento
// e textos/estados de exibição. Lógica pura — testável com node:test.

export interface WeekTransaction {
  id: string
  description: string
  amount: number
  date: string
  categoryId: string | null
}

export interface WeekData {
  enabled: boolean
  weekStart: string
  weekEnd: string
  limit: number
  spentThisWeek: number
  available: number
  perDayRemaining: number
  daysLeftInWeek: number
  variablePlanned: number
  variableSpentBeforeWeek: number
  monthPace: { projectedVariableSpend: number; projectedDiff: number }
  streak: number
  hasPlan: boolean
  transactions: WeekTransaction[]
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

export function mapWeek(w: any): WeekData {
  return {
    enabled: !!w?.enabled,
    weekStart: String(w?.weekStart ?? ""),
    weekEnd: String(w?.weekEnd ?? ""),
    limit: num(w?.limit),
    spentThisWeek: num(w?.spentThisWeek),
    available: num(w?.available),
    perDayRemaining: num(w?.perDayRemaining),
    daysLeftInWeek: num(w?.daysLeftInWeek),
    variablePlanned: num(w?.variablePlanned),
    variableSpentBeforeWeek: num(w?.variableSpentBeforeWeek),
    monthPace: {
      projectedVariableSpend: num(w?.monthPace?.projectedVariableSpend),
      projectedDiff: num(w?.monthPace?.projectedDiff),
    },
    streak: num(w?.streak),
    hasPlan: !!w?.hasPlan,
    transactions: (w?.transactions ?? []).map((t: any) => ({
      id: String(t.id),
      description: String(t.description ?? ""),
      amount: num(t.amount),
      date: String(t.date ?? ""),
      categoryId: t.categoryId ?? null,
    })),
  }
}

export type WeekTone = "ok" | "warning" | "over"

// Barra gasto × limite: até 80% tranquilo, a partir de 80% atenção, acima do limite estourado.
export function weekProgress(spent: number, limit: number): { pct: number; tone: WeekTone } {
  if (limit <= 0) return { pct: spent > 0 ? 100 : 0, tone: spent > 0 ? "over" : "ok" }
  const ratio = spent / limit
  const pct = Math.max(0, Math.min(100, ratio * 100))
  const tone: WeekTone = ratio > 1 + 1e-9 ? "over" : ratio >= 0.8 ? "warning" : "ok"
  return { pct, tone }
}

const WEEKDAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

// "YYYY-MM-DD" (ou ISO) → data local, sem deslocar pelo fuso.
export function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!m) return null
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

// "domingo, 9 nov"
export function formatWeekday(value: string): string {
  const d = parseLocalDate(value)
  if (!d) return ""
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

// "3 – 9 nov" / "29 nov – 5 dez"
export function formatWeekRange(start: string, end: string): string {
  const s = parseLocalDate(start)
  const e = parseLocalDate(end)
  if (!s || !e) return ""
  if (s.getMonth() === e.getMonth()) return `${s.getDate()} – ${e.getDate()} ${MONTHS[e.getMonth()]}`
  return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]}`
}

export function daysLeftLabel(days: number): string {
  if (days <= 1) return "último dia da semana"
  return `${days} dias até o fim da semana`
}

// projectedDiff > 0 = sobra (planejado − projetado); < 0 = acima do planejado.
export function paceMessage(
  projectedDiff: number,
  format: (v: number) => string,
): { text: string; tone: "ok" | "over" | "neutral" } {
  if (Math.abs(projectedDiff) < 1) return { text: "No ritmo atual, você termina o mês bem no planejado.", tone: "neutral" }
  if (projectedDiff > 0) return { text: `No ritmo atual, você termina o mês com ${format(projectedDiff)} de sobra.`, tone: "ok" }
  return { text: `No ritmo atual, você termina o mês ${format(Math.abs(projectedDiff))} acima do planejado.`, tone: "over" }
}

export function streakLabel(streak: number): string | null {
  if (streak <= 0) return null
  if (streak === 1) return "1 semana no azul"
  return `${streak} semanas seguidas no azul`
}

// Gastos da semana, do mais recente para o mais antigo, com os sem categoria contados.
export function sortWeekTransactions(transactions: WeekTransaction[]): { list: WeekTransaction[]; uncategorized: number } {
  const list = transactions.slice().sort((a, b) => b.date.localeCompare(a.date))
  return { list, uncategorized: list.filter((t) => !t.categoryId).length }
}
