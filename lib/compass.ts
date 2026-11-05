// Bússola: o que está fugindo do seu normal. Para cada categoria, o gasto do
// mês contra a média dos meses anteriores — no mesmo trecho do período (mês em
// andamento até o dia N compara com os anteriores até o dia N), para o gasto
// variável que ainda vai acontecer não parecer economia.

export interface CompassExpense {
  key: string // id da categoria ou a chave de "Sem categoria"
  amount: number
  date: string // ISO
}

export interface CompassRange {
  start: Date
  end: Date // inclusivo (fim do dia)
}

export interface CompassRow {
  key: string
  current: number
  normal: number
  diff: number // current − normal (> 0 = acima do normal)
}

export interface CompassResult {
  rows: CompassRow[] // por |diff|, maior primeiro
  previousMonths: number // meses anteriores com gasto usados na média
}

// Desvio menor que isso não aparece (ruído de centavos e de R$ 2 no café).
export const MIN_COMPASS_DIFF = 10

const round2 = (v: number) => Math.round(v * 100) / 100

function sumByKey(expenses: CompassExpense[], range: CompassRange): Map<string, number> {
  const from = range.start.getTime()
  const to = range.end.getTime()
  const totals = new Map<string, number>()
  for (const e of expenses) {
    const t = new Date(e.date).getTime()
    if (t < from || t > to) continue
    totals.set(e.key, (totals.get(e.key) ?? 0) + e.amount)
  }
  return totals
}

// Mesmo trecho de um período anterior: do início até o mesmo número de dias
// decorridos do período atual (sem passar do fim dele).
export function sameStretch(previous: CompassRange, current: CompassRange): CompassRange {
  const elapsedMs = current.end.getTime() - current.start.getTime()
  const end = new Date(Math.min(previous.start.getTime() + elapsedMs, previous.end.getTime()))
  return { start: previous.start, end }
}

export function compassDeviation(expenses: CompassExpense[], current: CompassRange, previous: CompassRange[]): CompassResult {
  const now = sumByKey(expenses, current)
  // Só entram na média os meses em que a pessoa já usava o app (com algum gasto).
  const before = previous.map((range) => sumByKey(expenses, sameStretch(range, current))).filter((m) => m.size > 0)
  if (before.length === 0) return { rows: [], previousMonths: 0 }

  const keys = new Set<string>([...now.keys(), ...before.flatMap((m) => [...m.keys()])])
  const rows: CompassRow[] = []
  for (const key of keys) {
    const currentValue = round2(now.get(key) ?? 0)
    const normal = round2(before.reduce((sum, m) => sum + (m.get(key) ?? 0), 0) / before.length)
    const diff = round2(currentValue - normal)
    if (Math.abs(diff) < MIN_COMPASS_DIFF) continue
    rows.push({ key, current: currentValue, normal, diff })
  }
  rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  return { rows, previousMonths: before.length }
}

// Frase do topo: a que mais puxou para cima; sem nenhuma acima, a que mais caiu.
// `skip` = chaves que não viram manchete ("Sem categoria" não diz para onde foi).
export function compassHeadline(
  allRows: CompassRow[],
  name: (key: string) => string,
  format: (value: number) => string,
  skip: string[] = [],
): string {
  const rows = allRows.filter((r) => !skip.includes(r.key))
  const up = rows.find((r) => r.diff > 0)
  if (up) return `${name(up.key)} é o que mais puxou para cima: +${format(up.diff)} em relação ao seu normal.`
  const down = rows.find((r) => r.diff < 0)
  if (down) return `Nada acima do seu normal. ${name(down.key)} foi o que mais caiu: −${format(Math.abs(down.diff))}.`
  return "Tudo perto do seu normal."
}
