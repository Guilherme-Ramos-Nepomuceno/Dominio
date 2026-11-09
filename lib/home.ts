// Home: agrupamento das transações recentes por dia ("Hoje", "Ontem",
// "1 de novembro"). Lógica pura — sem aliases "@/" — para rodar no test
// runner do Node.

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]

export interface DayGroup<T> {
  key: string
  label: string
  items: T[]
}

const pad = (n: number) => String(n).padStart(2, "0")

// Dia LOCAL da transação: "YYYY-MM-DD" puro já é o dia; com horário (ISO em
// UTC), converte para o fuso do navegador — 01/11 22h em São Paulo é 02/11 01h UTC.
export function dayKey(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 10)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function previousDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(y, m - 1, d - 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function dayGroupLabel(key: string, todayISO: string): string {
  if (key === todayISO) return "Hoje"
  if (key === previousDay(todayISO)) return "Ontem"
  const [, m, d] = key.split("-").map(Number)
  return `${d} de ${MONTHS[m - 1] ?? ""}`
}

// Mais recentes primeiro; a ordem dos grupos segue a das transações.
export function groupByDay<T extends { date: string }>(transactions: T[], todayISO: string): DayGroup<T>[] {
  const time = (t: T) => new Date(/^\d{4}-\d{2}-\d{2}$/.test(t.date) ? `${t.date}T12:00:00` : t.date).getTime()
  const sorted = transactions.slice().sort((a, b) => time(b) - time(a))
  const groups: DayGroup<T>[] = []
  for (const t of sorted) {
    const key = dayKey(t.date)
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.items.push(t)
    else groups.push({ key, label: dayGroupLabel(key, todayISO), items: [t] })
  }
  return groups
}

// ---------------------------------------------------------------------------
// Daqui pra frente: saídas agendadas até o fim da semana
// ---------------------------------------------------------------------------

const WEEKDAYS_SHORT = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"]
const MONTHS_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  const date = new Date(y, m - 1, d + 1)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// "hoje" / "amanhã" / "sex, 7 nov".
export function upcomingDayLabel(key: string, todayISO: string): string {
  if (key === todayISO) return "hoje"
  if (key === nextDay(todayISO)) return "amanhã"
  const [y, m, d] = key.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  return `${WEEKDAYS_SHORT[date.getDay()]}, ${d} ${MONTHS_SHORT[m - 1] ?? ""}`
}

// Despesas agendadas (pendentes) de hoje até `untilISO`, em ordem de data, e a
// próxima depois disso — para a Home dizer o que ainda vai sair na semana, ou
// quando é a próxima conta se não houver nada até domingo.
export function upcomingOutflows<T extends { date: string; type: string }>(
  pending: T[],
  todayISO: string,
  untilISO: string,
): { within: T[]; next: T | null } {
  const ahead = pending
    .filter((t) => t.type === "expense" && dayKey(t.date) >= todayISO)
    .sort((a, b) => dayKey(a.date).localeCompare(dayKey(b.date)))
  const within = ahead.filter((t) => dayKey(t.date) <= untilISO)
  const next = ahead.find((t) => dayKey(t.date) > untilISO) ?? null
  return { within, next }
}

// --- Herói da Home: quanto dá para gastar hoje ---

export type HomeTodayState = "ok" | "recover" | "used" | "exceeded" | "saved"

export interface HomeToday {
  // Valor de hoje: o por dia da semana; acima do ritmo, o de recuperação;
  // sem saldo na semana, zero.
  today: number
  state: HomeTodayState
  // Quanto a semana passou do limite (só em "exceeded").
  overBy: number
}

export function homeToday(
  week: { available: number; perDayRemaining: number; savedThisWeek?: { amount: number } | null },
  recovery: { perDayToRecover: number } | null,
): HomeToday {
  if (week.available < 0) return { today: 0, state: "exceeded", overBy: -week.available }
  // A sobra da semana foi guardada: o disponível zerou por escolha.
  if (week.available === 0 && week.savedThisWeek) return { today: 0, state: "saved", overBy: 0 }
  if (week.available === 0) return { today: 0, state: "used", overBy: 0 }
  if (recovery && recovery.perDayToRecover > 0) {
    return { today: Math.min(Math.floor(recovery.perDayToRecover), week.available), state: "recover", overBy: 0 }
  }
  return { today: Math.min(week.perDayRemaining, week.available), state: "ok", overBy: 0 }
}

// Barra "esta semana" em tom neutro: até o limite numa cor só; o que passou
// do limite vira um trecho à parte no fim (a única parte colorida).
export function weekBarSplit(spent: number, limit: number): { withinPct: number; overPct: number } {
  if (spent <= 0) return { withinPct: 0, overPct: 0 }
  if (limit <= 0) return { withinPct: 0, overPct: 100 }
  if (spent <= limit) return { withinPct: (spent / limit) * 100, overPct: 0 }
  const withinPct = (limit / spent) * 100
  return { withinPct, overPct: 100 - withinPct }
}
