// Período do "mês" do plano: do dia `monthStartDay` até a véspera do mesmo
// dia no mês seguinte (dia que não existe no mês é limitado ao último dia —
// ex.: começo dia 31 em fevereiro vira dia 28/29). Com monthStartDay = 1 é o
// mês civil. Mesma regra do backend, para que o seletor de mês e qualquer
// filtragem local por mês batam com os totais calculados no servidor.
//
// Lógica pura (sem aliases "@/" nem imports de runtime) — testável com node:test.

export interface PlanPeriod {
  year: number
  month: number // 1-12
  // Datas locais (00:00) do primeiro e do último dia do período, inclusive.
  start: Date
  end: Date
  // "YYYY-MM-DD" — comparáveis como string.
  startISO: string
  endISO: string
}

const MONTH_ABBR_LOWER = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function normalizeMonthStartDay(day: unknown): number {
  const n = Math.trunc(Number(day))
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(31, n)
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function monthKey(year: number, month: number): string {
  return `${year}-${pad(month)}`
}

export function parseMonthKey(key: string): { year: number; month: number } {
  const [year, month] = key.split("-").map(Number)
  return { year, month }
}

export function addMonths(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

// Primeiro dia do período do mês (year, month), com clamp ao fim do mês.
function periodStartDate(year: number, month: number, monthStartDay: number): Date {
  const day = Math.min(normalizeMonthStartDay(monthStartDay), daysInMonth(year, month))
  return new Date(year, month - 1, day)
}

export function getPlanPeriod(year: number, month: number, monthStartDay: number): PlanPeriod {
  const start = periodStartDate(year, month, monthStartDay)
  const next = addMonths(year, month, 1)
  const nextStart = periodStartDate(next.year, next.month, monthStartDay)
  const end = new Date(nextStart.getFullYear(), nextStart.getMonth(), nextStart.getDate() - 1)
  return { year, month, start, end, startISO: toISODate(start), endISO: toISODate(end) }
}

// A qual "mês do plano" uma data pertence (ex.: com início no dia 5, o dia
// 1º de novembro ainda é do plano de outubro).
export function getPlanMonthForDate(date: Date, monthStartDay: number): { year: number; month: number } {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const start = periodStartDate(year, month, monthStartDay)
  const day = new Date(year, month - 1, date.getDate())
  if (day >= start) return { year, month }
  return addMonths(year, month, -1)
}

export function getCurrentPlanMonthKey(monthStartDay: number, now: Date = new Date()): string {
  const { year, month } = getPlanMonthForDate(now, monthStartDay)
  return monthKey(year, month)
}

// Parte "YYYY-MM-DD" de uma data vinda da API. Mesma convenção do resto do
// app (isSameMonth compara o prefixo da string ISO), para não mudar o mês em
// que uma transação cai só por causa do fuso.
export function datePart(dateString: string): string {
  return dateString.slice(0, 10)
}

export function isDateInPeriod(dateString: string, period: Pick<PlanPeriod, "startISO" | "endISO">): boolean {
  if (!dateString) return false
  const d = datePart(dateString)
  return d >= period.startISO && d <= period.endISO
}

// Filtra por "mês do plano" a partir da chave "YYYY-MM" do seletor de mês.
export function isInPlanMonth(dateString: string, monthKeyStr: string, monthStartDay: number): boolean {
  const { year, month } = parseMonthKey(monthKeyStr)
  return isDateInPeriod(dateString, getPlanPeriod(year, month, monthStartDay))
}

// "5 nov – 4 dez" (ano só quando o período atravessa a virada do ano: "5 dez – 4 jan").
export function formatPeriodRange(period: Pick<PlanPeriod, "start" | "end">): string {
  const s = period.start
  const e = period.end
  return `${s.getDate()} ${MONTH_ABBR_LOWER[s.getMonth()]} – ${e.getDate()} ${MONTH_ABBR_LOWER[e.getMonth()]}`
}

// Intervalo para exibir junto do nome do mês — só quando o mês não é o civil.
export function periodLabel(monthKeyStr: string, monthStartDay: number): string | null {
  if (normalizeMonthStartDay(monthStartDay) === 1) return null
  const { year, month } = parseMonthKey(monthKeyStr)
  return formatPeriodRange(getPlanPeriod(year, month, monthStartDay))
}

// Dias do período (inclusive) e quantos já passaram até `today`.
export function periodDayCount(period: Pick<PlanPeriod, "start" | "end">): number {
  return Math.round((period.end.getTime() - period.start.getTime()) / 86_400_000) + 1
}
