// Vitórias (reforço positivo) das telas Minha semana e Planejar mês: tipos do
// contrato GET /plans/:year/:month/wins, mapeamento e textos de exibição.
// Lógica pura — sem aliases "@/" — para rodar no test runner do Node.

import { formatMoneyWhole } from "./plan-layout.ts"
import type { Plan, PlanWish } from "./plan.ts"

export type WinKind =
  | "DAYS_UNDER"
  | "CATEGORY_BELOW_AVG"
  | "LOGGING_STREAK"
  | "INBOX_ZERO"
  | "WISH_NOW_FITS"
  | "WEEK_UNDER"
  | "WEEKS_STREAK"
  | "PLAN_CONFIRMED"
  | "GROUP_UNDER"
  | "WISH_BOUGHT_IN_PLAN"

export interface Win {
  id: string
  kind: WinKind
  title: string
  detail: string | null
  value: number | null
  priority: number
}

export type DayStatus = "UNDER" | "OVER" | "NO_SPEND" | "FUTURE"
export type GroupPaceStatus = "UNDER" | "ON_TRACK" | "OVER"

export interface WinsData {
  week: {
    dayStatus: Array<{ date: string; status: DayStatus }>
    wins: Win[]
    recovery: { perDayToRecover: number; untilDate: string } | null
    weekClosed: { closedUnder: boolean; leftover: number } | null
  }
  month: {
    wins: Win[]
    groupStatus: Array<{ groupId: string; status: GroupPaceStatus; remaining: number }>
    savingsVsAverage: Array<{ categoryId: string; name: string; saved: number }>
    wishProgress: Array<{ wishId: string; name: string; pct: number; sourceCategoryName: string | null }>
    wishesBoughtWithinPlan: number
    wishesBoughtWithinPlanIds: string[]
    wishesBoughtThisYear: number
    vsLastMonth: Array<{ groupId: string; plannedDiff: number }>
  }
}

const KINDS: readonly WinKind[] = [
  "DAYS_UNDER",
  "CATEGORY_BELOW_AVG",
  "LOGGING_STREAK",
  "INBOX_ZERO",
  "WISH_NOW_FITS",
  "WEEK_UNDER",
  "WEEKS_STREAK",
  "PLAN_CONFIRMED",
  "GROUP_UNDER",
  "WISH_BOUGHT_IN_PLAN",
]

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const numOrNull = (v: unknown): number | null => (v === null || v === undefined || v === "" ? null : num(v))
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : [])
const oneOf = <T extends string>(value: unknown, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback

function mapWin(w: any): Win | null {
  if (!KINDS.includes(w?.kind) || !w?.title) return null
  return {
    id: String(w.id ?? w.kind),
    kind: w.kind,
    title: String(w.title),
    detail: w.detail ? String(w.detail) : null,
    value: numOrNull(w.value),
    priority: num(w.priority),
  }
}

// Até 3 por escopo (o backend já corta; aqui é só defesa).
const mapWinList = (v: unknown): Win[] =>
  arr(v)
    .map(mapWin)
    .filter((w): w is Win => !!w)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3)

export function mapWins(raw: any): WinsData {
  const week = raw?.week ?? {}
  const month = raw?.month ?? {}
  return {
    week: {
      dayStatus: arr(week.dayStatus).map((d) => ({
        date: String(d?.date ?? ""),
        status: oneOf(d?.status, ["UNDER", "OVER", "NO_SPEND", "FUTURE"] as const, "FUTURE"),
      })),
      wins: mapWinList(week.wins),
      recovery:
        week.recovery && num(week.recovery.perDayToRecover) > 0
          ? { perDayToRecover: num(week.recovery.perDayToRecover), untilDate: String(week.recovery.untilDate ?? "") }
          : null,
      weekClosed: week.weekClosed
        ? { closedUnder: !!week.weekClosed.closedUnder, leftover: num(week.weekClosed.leftover) }
        : null,
    },
    month: {
      wins: mapWinList(month.wins),
      groupStatus: arr(month.groupStatus).map((g) => ({
        groupId: String(g?.groupId ?? ""),
        status: oneOf(g?.status, ["UNDER", "ON_TRACK", "OVER"] as const, "ON_TRACK"),
        remaining: num(g?.remaining),
      })),
      savingsVsAverage: arr(month.savingsVsAverage).map((s) => ({
        categoryId: String(s?.categoryId ?? ""),
        name: String(s?.name ?? ""),
        saved: num(s?.saved),
      })),
      wishProgress: arr(month.wishProgress).map((w) => ({
        wishId: String(w?.wishId ?? ""),
        name: String(w?.name ?? ""),
        pct: Math.max(0, Math.min(100, num(w?.pct))),
        sourceCategoryName: w?.sourceCategoryName ? String(w.sourceCategoryName) : null,
      })),
      wishesBoughtWithinPlan: num(month.wishesBoughtWithinPlan),
      wishesBoughtWithinPlanIds: arr(month.wishesBoughtWithinPlanIds).map(String),
      wishesBoughtThisYear: num(month.wishesBoughtThisYear),
      vsLastMonth: arr(month.vsLastMonth).map((v) => ({ groupId: String(v?.groupId ?? ""), plannedDiff: num(v?.plannedDiff) })),
    },
  }
}

// ---------------------------------------------------------------------------
// Vitórias: ícone por tipo e o cartão neutro quando não há nada
// ---------------------------------------------------------------------------

export type WinIcon = "check" | "trophy" | "flame" | "piggy" | "pencil" | "tray" | "gift" | "calendar" | "bag"

export const WIN_ICON: Record<WinKind, WinIcon> = {
  DAYS_UNDER: "check",
  WEEK_UNDER: "trophy",
  WEEKS_STREAK: "flame",
  CATEGORY_BELOW_AVG: "piggy",
  LOGGING_STREAK: "pencil",
  INBOX_ZERO: "tray",
  WISH_NOW_FITS: "gift",
  PLAN_CONFIRMED: "calendar",
  GROUP_UNDER: "check",
  WISH_BOUGHT_IN_PLAN: "bag",
}

// Sem vitória não se inventa uma: um incentivo neutro e útil.
export function winsEncouragement(scope: "week" | "month", hasPlan: boolean): { title: string; detail: string; href: string | null } {
  if (scope === "month" && !hasPlan) {
    return { title: "Monte o plano do mês", detail: "Decida para onde vai cada real e veja o que cabe nos seus desejos.", href: null }
  }
  if (scope === "month") {
    return { title: "Siga o plano esta semana", detail: "Registre os gastos e acompanhe o ritmo em Minha semana.", href: "/week" }
  }
  return { title: "Registre seus gastos de hoje", detail: "Assim você acompanha seu ritmo da semana.", href: null }
}

// ---------------------------------------------------------------------------
// Faixa de dias da semana
// ---------------------------------------------------------------------------

const DAY_LETTER = ["D", "S", "T", "Q", "Q", "S", "S"]
const WEEKDAY_NAME = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"]

function parseLocalDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  UNDER: "dentro do ideal",
  OVER: "acima do ideal",
  NO_SPEND: "sem gasto",
  FUTURE: "ainda não chegou",
}

export interface DayDot {
  date: string
  letter: string
  dayName: string
  status: DayStatus
  isToday: boolean
  label: string
}

export function dayDots(days: Array<{ date: string; status: DayStatus }>, todayISO: string): DayDot[] {
  return days.map((d) => {
    const date = parseLocalDate(d.date)
    const dayName = date ? WEEKDAY_NAME[date.getDay()] : ""
    const isToday = d.date === todayISO
    // Hoje ainda não acabou: sem gasto hoje não é "dia sem gasto" fechado.
    const statusText = isToday && d.status === "NO_SPEND" ? "sem gasto até agora" : DAY_STATUS_LABEL[d.status]
    return {
      date: d.date,
      letter: date ? DAY_LETTER[date.getDay()] : "",
      dayName,
      status: d.status,
      isToday,
      label: `${dayName}${isToday ? " (hoje)" : ""}: ${statusText}`,
    }
  })
}

export function dayDotsSummary(dots: DayDot[]): string {
  const past = dots.filter((d) => d.status !== "FUTURE")
  if (past.length === 0) return "Nenhum dia da semana passou ainda."
  const count = (s: DayStatus) => past.filter((d) => d.status === s).length
  const parts = [
    count("UNDER") && `${count("UNDER")} dentro do ideal`,
    count("NO_SPEND") && `${count("NO_SPEND")} sem gasto`,
    count("OVER") && `${count("OVER")} acima do ideal`,
  ].filter(Boolean)
  return `Dias da semana até hoje: ${parts.join(", ")}.`
}

// ---------------------------------------------------------------------------
// Herói: recuperação e fechamento
// ---------------------------------------------------------------------------

// "até R$ X por dia": arredonda para BAIXO — gastar o valor exibido nunca
// pode estourar o limite.
export function recoveryMessage(recovery: { perDayToRecover: number; untilDate: string } | null): string | null {
  if (!recovery || recovery.perDayToRecover <= 0) return null
  const date = parseLocalDate(recovery.untilDate)
  const until = date ? WEEKDAY_NAME[date.getDay()] : "o fim da semana"
  const perDay = formatMoneyWhole(Math.floor(recovery.perDayToRecover))
  return `Gastando até ${perDay} por dia até ${until}, você fecha a semana dentro do limite.`
}

export function weekClosedCelebration(closed: { closedUnder: boolean; leftover: number } | null): { title: string; detail: string } | null {
  if (!closed || !closed.closedUnder) return null
  if (closed.leftover < 1) return { title: "Semana no azul!", detail: "Você fechou a semana dentro do limite." }
  return { title: "Semana no azul!", detail: `Sobrou ${formatMoneyWhole(closed.leftover)} do limite.` }
}

// "O que você deixou de gastar em Delivery já paga 40% do Tênis"
export function wishProgressMessage(item: { name: string; pct: number; sourceCategoryName: string | null }): string {
  const where = item.sourceCategoryName ? ` em ${item.sourceCategoryName}` : " este mês"
  if (item.pct >= 100) return `O que você deixou de gastar${where} já paga ${item.name} inteiro`
  return `O que você deixou de gastar${where} já paga ${item.pct}% de ${item.name}`
}

// ---------------------------------------------------------------------------
// Planejar mês
// ---------------------------------------------------------------------------

export function groupStatusLabel(
  status: { status: GroupPaceStatus; remaining: number } | undefined,
): { text: string; tone: "good" | "neutral" | "over" } | null {
  if (!status) return null
  if (status.status === "OVER") return { text: "acima do plano", tone: "over" }
  if (status.status === "ON_TRACK") return { text: "no ritmo", tone: "neutral" }
  if (status.remaining >= 1) return { text: `dentro do plano, ${formatMoneyWhole(status.remaining)} disponível`, tone: "good" }
  return { text: "dentro do plano", tone: "good" }
}

const MONTH_NAME = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]

export function previousMonthName(month: number): string {
  return MONTH_NAME[(month + 10) % 12]
}

// "R$ 150 a menos que em outubro" — só diferenças de pelo menos R$ 10.
export function vsLastMonthHint(diff: number | undefined, month: number): string | null {
  if (diff === undefined || Math.abs(diff) < 10) return null
  const prev = previousMonthName(month)
  return diff < 0
    ? `${formatMoneyWhole(Math.abs(diff))} a menos que em ${prev}`
    : `${formatMoneyWhole(diff)} a mais que em ${prev}`
}

export function wishesRealizedLabel(count: number): string | null {
  if (count <= 0) return null
  return count === 1 ? "1 desejo realizado este ano" : `${count} desejos realizados este ano`
}

export interface ConfirmSummary {
  essentials: number
  fittingWishes: number
  free: number
}

// Resumo do "mês organizado": o essencial garantido, desejos que cabem e o
// que fica livre depois deles.
export function confirmSummary(plan: Pick<Plan, "groups" | "wishes" | "leftover">): ConfirmSummary {
  const essentials = plan.groups.filter((g) => g.kind === "ESSENTIALS").reduce((sum, g) => sum + g.planned, 0)
  const fittingWishes = plan.wishes.filter((w: PlanWish) => w.status === "OPEN" && w.fits).length
  return { essentials, fittingWishes, free: Math.max(0, plan.leftover) }
}

export function confirmSummaryLines(summary: ConfirmSummary): string[] {
  const lines: string[] = []
  if (summary.essentials >= 1) lines.push(`${formatMoneyWhole(summary.essentials)} garantidos para o essencial`)
  if (summary.fittingWishes > 0) {
    lines.push(summary.fittingWishes === 1 ? "1 desejo cabe no mês" : `${summary.fittingWishes} desejos cabem no mês`)
  }
  if (summary.free >= 1) lines.push(`${formatMoneyWhole(summary.free)} livres`)
  return lines
}
