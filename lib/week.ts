// "Minha semana": tipos do contrato (GET /plans/:year/:month/week), mapeamento
// e textos/estados de exibição. Lógica pura — testável com node:test.

export interface WeekTransaction {
  id: string
  description: string
  amount: number
  date: string
  categoryId: string | null
}

export type PaceStatus = "UNDER" | "ON_TRACK" | "OVER"
export type ProjectionConfidence = "LOW" | "MEDIUM" | "HIGH"
export type PeriodWeekStatus = "DONE_UNDER" | "DONE_OVER" | "CURRENT" | "FUTURE"

export interface WeekDay {
  date: string
  spent: number
  isFuture: boolean
}

export interface MonthSeriesPoint {
  date: string
  cumulativeSpent: number | null
  projected: number | null
  projectedLow: number | null
  projectedHigh: number | null
}

export interface PeriodWeek {
  index: number
  weekStart: string
  weekEnd: string
  limit: number
  spent: number | null
  status: PeriodWeekStatus
}

export interface WeekCategory {
  categoryId: string | null
  name: string
  color: string | null
  icon: string | null
  spentThisWeek: number
  transactionCount: number
  plannedVariable: number | null
  spentInPeriod: number
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
  monthPace: { projectedVariableSpend: number; projectedDiff: number; confidence: ProjectionConfidence }
  streak: number
  hasPlan: boolean
  transactions: WeekTransaction[]
  days: WeekDay[]
  idealPerDay: number
  expectedSpentToDate: number
  paceStatus: PaceStatus
  monthSeries: MonthSeriesPoint[]
  weeks: PeriodWeek[]
  categories: WeekCategory[]
  // hasPlan = aquela semana tinha plano (sem plano o limite vinha da meta mensal).
  lastWeek: { spent: number; limit: number; hasPlan: boolean } | null
}

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

const numOrNull = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback

const arr = (v: unknown): any[] => (Array.isArray(v) ? v : [])

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
      // Sem o campo (API antiga), trata como "ainda cedo": não exibe número.
      confidence: oneOf(w?.monthPace?.confidence, ["LOW", "MEDIUM", "HIGH"] as const, "LOW"),
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
    days: arr(w?.days).map((d) => ({ date: String(d?.date ?? ""), spent: num(d?.spent), isFuture: !!d?.isFuture })),
    idealPerDay: num(w?.idealPerDay),
    expectedSpentToDate: num(w?.expectedSpentToDate),
    paceStatus: oneOf(w?.paceStatus, ["UNDER", "ON_TRACK", "OVER"] as const, "ON_TRACK"),
    monthSeries: arr(w?.monthSeries).map((p) => ({
      date: String(p?.date ?? ""),
      cumulativeSpent: numOrNull(p?.cumulativeSpent),
      projected: numOrNull(p?.projected),
      projectedLow: numOrNull(p?.projectedLow),
      projectedHigh: numOrNull(p?.projectedHigh),
    })),
    weeks: arr(w?.weeks).map((x, i) => ({
      index: num(x?.index) || i + 1,
      weekStart: String(x?.weekStart ?? ""),
      weekEnd: String(x?.weekEnd ?? ""),
      limit: num(x?.limit),
      spent: numOrNull(x?.spent),
      status: oneOf(x?.status, ["DONE_UNDER", "DONE_OVER", "CURRENT", "FUTURE"] as const, "FUTURE"),
    })),
    categories: arr(w?.categories).map((c) => ({
      categoryId: c?.categoryId ?? null,
      name: String(c?.name ?? ""),
      color: c?.color ?? null,
      icon: c?.icon ?? null,
      spentThisWeek: num(c?.spentThisWeek),
      transactionCount: num(c?.transactionCount),
      plannedVariable: numOrNull(c?.plannedVariable),
      spentInPeriod: num(c?.spentInPeriod),
    })),
    lastWeek: w?.lastWeek
      ? {
          spent: num(w.lastWeek.spent),
          limit: num(w.lastWeek.limit),
          // API antiga (sem o campo): só havia limite com plano ou meta — mantém o %.
          hasPlan: w.lastWeek.hasPlan === undefined ? true : !!w.lastWeek.hasPlan,
        }
      : null,
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

// --- Tela nova: ritmo, gráficos, semanas e categorias ---

type Fmt = (v: number) => string

// Selo de ritmo da semana (cor semântica sempre acompanhada de ícone + texto).
export function paceBadge(status: PaceStatus): { label: string; tone: "good" | "neutral" | "over"; hint: string } {
  if (status === "UNDER") return { label: "Abaixo do ritmo", tone: "good", hint: "gastando menos do que o limite permite até hoje" }
  if (status === "OVER") return { label: "Acima do ritmo", tone: "over", hint: "gastando mais do que o limite permite até hoje" }
  return { label: "No ritmo", tone: "neutral", hint: "gastando perto do que o limite permite até hoje" }
}

// Frase da projeção do mês. Com confiança baixa (começo do mês / nenhum
// gasto) não mostra número — ele enganaria.
export function projectionMessage(
  monthPace: { projectedDiff: number; confidence: ProjectionConfidence },
  format: Fmt,
): { text: string; tone: "ok" | "over" | "neutral" } {
  if (monthPace.confidence === "LOW") return { text: "Ainda é cedo para projetar — por enquanto vale o seu plano.", tone: "neutral" }
  const diff = monthPace.projectedDiff
  if (Math.abs(diff) < 1) return { text: "No ritmo atual, você termina bem no planejado.", tone: "neutral" }
  if (diff > 0) return { text: `No ritmo atual, você termina com ${format(diff)} de sobra.`, tone: "ok" }
  return { text: `No ritmo atual, você termina ${format(Math.abs(diff))} acima do plano.`, tone: "over" }
}

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]

export interface DayBar {
  date: string
  label: string
  dayOfMonth: number
  spent: number
  isFuture: boolean
  isToday: boolean
}

// Barras da semana. "Hoje" = o último dia que já não é futuro.
export function dayBars(days: WeekDay[]): DayBar[] {
  let todayIndex = -1
  days.forEach((d, i) => {
    if (!d.isFuture) todayIndex = i
  })
  return days.map((d, i) => {
    const date = parseLocalDate(d.date)
    return {
      date: d.date,
      label: date ? WEEKDAYS_SHORT[date.getDay()] : "",
      dayOfMonth: date ? date.getDate() : 0,
      spent: d.isFuture ? 0 : d.spent,
      isFuture: d.isFuture,
      isToday: i === todayIndex,
    }
  })
}

// Resumo em texto do gráfico da semana (aria-label).
export function weekChartSummary(bars: DayBar[], idealPerDay: number, format: Fmt): string {
  const past = bars.filter((b) => !b.isFuture)
  if (past.length === 0) return `Nenhum dia da semana passou ainda. Ideal: ${format(idealPerDay)} por dia.`
  const parts = past.map((b) => `${b.label}${b.isToday ? " (hoje)" : ""} ${format(b.spent)}`)
  return `Gasto por dia nesta semana: ${parts.join(", ")}. Ideal: ${format(idealPerDay)} por dia.`
}

export interface MonthChartPoint {
  date: string
  dayOfMonth: number
  real: number | null
  projected: number | null
  band: [number, number] | null
}

export function monthChartData(series: MonthSeriesPoint[]): MonthChartPoint[] {
  return series.map((p) => {
    const d = parseLocalDate(p.date)
    return {
      date: p.date,
      dayOfMonth: d ? d.getDate() : 0,
      real: p.cumulativeSpent,
      projected: p.projected,
      band: p.projectedLow !== null && p.projectedHigh !== null ? [p.projectedLow, p.projectedHigh] : null,
    }
  })
}

// Último ponto real (hoje) da série do mês.
export function lastRealPoint(series: MonthSeriesPoint[]): { date: string; value: number } | null {
  for (let i = series.length - 1; i >= 0; i--) {
    const v = series[i].cumulativeSpent
    if (v !== null) return { date: series[i].date, value: v }
  }
  return null
}

export function monthChartSummary(
  week: Pick<WeekData, "monthSeries" | "monthPace" | "variablePlanned" | "hasPlan">,
  format: Fmt,
): string {
  const today = lastRealPoint(week.monthSeries)
  const planned = `${week.hasPlan ? "Planejado" : "Meta mensal"}: ${format(week.variablePlanned)}.`
  const spent = today ? `Gasto variável até hoje: ${format(today.value)}.` : ""
  const end = week.monthSeries[week.monthSeries.length - 1]
  const projection =
    week.monthPace.confidence === "LOW" || !end || end.projected === null
      ? "Ainda é cedo para projetar."
      : `Projeção para o fim do mês: ${format(end.projected)} (entre ${format(end.projectedLow ?? end.projected)} e ${format(end.projectedHigh ?? end.projected)}).`
  return [spent, planned, projection].filter(Boolean).join(" ")
}

// Valor curto para eixo: 0 / 450 / 1,5 mil.
export function compactAmount(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
  }
  return String(Math.round(value))
}

export interface WeekRow {
  key: string
  title: string
  range: string
  limitText: string
  spentText: string
  kind: "under" | "over" | "current" | "future"
  diffText: string
}

export function weekRows(weeks: PeriodWeek[], format: Fmt): WeekRow[] {
  return weeks.map((w) => {
    const base = {
      key: w.weekStart,
      title: `Semana ${w.index}`,
      range: formatWeekRange(w.weekStart, w.weekEnd),
      limitText: format(w.limit),
    }
    if (w.status === "FUTURE" || w.spent === null) {
      return { ...base, spentText: "—", kind: "future" as const, diffText: "prevista" }
    }
    const diff = w.limit - w.spent
    const spentText = format(w.spent)
    if (w.status === "CURRENT") {
      return {
        ...base,
        spentText,
        kind: "current" as const,
        diffText: diff >= 0 ? `faltam ${format(diff)}` : `${format(Math.abs(diff))} acima`,
      }
    }
    if (w.status === "DONE_OVER") return { ...base, spentText, kind: "over" as const, diffText: `${format(Math.abs(diff))} acima` }
    return { ...base, spentText, kind: "under" as const, diffText: `${format(diff)} dentro` }
  })
}

export interface CategoryRow {
  key: string
  categoryId: string | null
  name: string
  color: string | null
  spentText: string
  barPct: number
  plannedText: string | null
  transactionCount: number
}

// Barras relativas ao maior gasto da semana; "% do planejado do mês" =
// gasto da categoria no período até hoje ÷ variável planejado dela.
export function categoryRows(categories: WeekCategory[], format: Fmt): CategoryRow[] {
  const max = Math.max(0, ...categories.map((c) => c.spentThisWeek))
  return categories.map((c) => ({
    key: c.categoryId ?? "__uncategorized__",
    categoryId: c.categoryId,
    name: c.categoryId ? c.name : `Sem categoria (${c.transactionCount})`,
    color: c.color,
    spentText: format(c.spentThisWeek),
    barPct: max > 0 ? Math.max(2, (c.spentThisWeek / max) * 100) : 0,
    plannedText:
      c.plannedVariable && c.plannedVariable > 0
        ? `${Math.round((c.spentInPeriod / c.plannedVariable) * 100)}% do planejado do mês`
        : null,
    transactionCount: c.transactionCount,
  }))
}

// Sem plano na semana passada, "% do limite" não quer dizer nada: só o gasto.
export function lastWeekLabel(lastWeek: { spent: number; limit: number; hasPlan?: boolean } | null, format: Fmt): string | null {
  if (!lastWeek) return null
  if (lastWeek.limit <= 0 || lastWeek.hasPlan === false) return `Semana passada: ${format(lastWeek.spent)} gastos`
  return `Semana passada: ${format(lastWeek.spent)}, ${Math.round((lastWeek.spent / lastWeek.limit) * 100)}% do limite`
}

// Ticks "redondos" para o eixo Y (passo 1/2/2,5/5 × 10ⁿ), de 0 até cobrir `max`.
export function niceTicks(max: number, target = 3): number[] {
  if (!(max > 0)) return [0, 1]
  const raw = max / target
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * magnitude >= raw) ?? 10) * magnitude
  const ticks: number[] = []
  for (let v = 0; v < max + step - 1e-9; v += step) ticks.push(Math.round(v * 100) / 100)
  return ticks
}

// --- Herói: cor da barra = estado do ritmo (o mesmo do selo) ---

export type HeroBarTone = "good" | "neutral" | "warning" | "over"

// Barra e selo contam a mesma história: abaixo do ritmo = positiva, no ritmo
// = neutra, acima do ritmo = atenção (âmbar). Vermelho só quando o limite da
// semana já estourou.
export function heroBarTone(paceStatus: PaceStatus, spent: number, limit: number): HeroBarTone {
  if (spent > limit + 1e-9 && spent > 0) return "over"
  if (paceStatus === "OVER") return "warning"
  if (paceStatus === "UNDER") return "good"
  return "neutral"
}

// --- Semanas do mês: uma pílula por semana ---

export interface WeekPill {
  key: string
  short: string
  kind: "under" | "over" | "current" | "future"
  stateText: string
  detail: string
  ariaLabel: string
}

export function weekPills(weeks: PeriodWeek[], format: Fmt): WeekPill[] {
  return weekRows(weeks, format).map((row, i) => {
    const short = `S${weeks[i].index}`
    const stateText =
      row.kind === "under" ? "dentro do limite" : row.kind === "over" ? "acima do limite" : row.kind === "current" ? "semana atual" : "prevista"
    const detail =
      row.kind === "future"
        ? `${row.title} · ${row.range} · limite previsto ${row.limitText}`
        : `${row.title} · ${row.range} · gasto ${row.spentText} de ${row.limitText} (${row.diffText})`
    return { key: row.key, short, kind: row.kind, stateText, detail, ariaLabel: `${row.title}, ${stateText}` }
  })
}
