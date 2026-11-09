// Dados de exemplo para a conta nova: em vez de esconder o que ainda não tem
// dado, a tela mostra como vai ficar — apagado, com o selo "Exemplo" e um
// botão para a ação que preenche de verdade. As datas e o limite vêm da
// pessoa; só os valores são inventados (e sempre os mesmos). Lógica pura.

import type { MonthSeriesPoint, PeriodWeek, WeekCategory, WeekDay } from "./week.ts"

const round2 = (n: number) => Math.round(n * 100) / 100

// Variação fixa (sem aleatório): o exemplo não muda a cada visita.
const WAVE = [1.1, 0.6, 1.4, 0.9, 1.2, 0.4, 1.0, 1.3, 0.7, 1.1]
const wave = (i: number) => WAVE[i % WAVE.length]

export const SAMPLE_CATEGORIES: WeekCategory[] = [
  { categoryId: "sample-mercado", name: "Mercado", color: "#f97316", icon: "ShoppingCart", spentThisWeek: 186.4, transactionCount: 3, plannedVariable: 900, spentInPeriod: 412.3 },
  { categoryId: "sample-delivery", name: "Restaurantes e delivery", color: "#f87171", icon: "ForkKnife", spentThisWeek: 92.5, transactionCount: 4, plannedVariable: 300, spentInPeriod: 188.0 },
  { categoryId: "sample-transporte", name: "Transporte", color: "#fb923c", icon: "Car", spentThisWeek: 64.0, transactionCount: 5, plannedVariable: 350, spentInPeriod: 141.6 },
  { categoryId: "sample-lazer", name: "Lazer", color: "#a78bfa", icon: "GameController", spentThisWeek: 38.9, transactionCount: 1, plannedVariable: 200, spentInPeriod: 38.9 },
]

// Semanas do mês: as que já passaram com gasto de exemplo (uma acima do
// limite, para mostrar os dois estados), a atual pela metade.
export function samplePeriodWeeks(weeks: PeriodWeek[]): PeriodWeek[] {
  return weeks.map((w, i) => {
    if (w.status === "FUTURE") return { ...w, spent: null }
    if (w.status === "CURRENT") return { ...w, spent: round2(w.limit * 0.45) }
    const over = i === 1
    return { ...w, spent: round2(w.limit * (over ? 1.12 : 0.82)), status: over ? "DONE_OVER" : "DONE_UNDER" }
  })
}

// Dias da semana: gasto de exemplo nos dias que já passaram.
export function sampleWeekDays(days: WeekDay[], idealPerDay: number): WeekDay[] {
  const base = idealPerDay > 0 ? idealPerDay : 80
  return days.map((d, i) => (d.isFuture ? d : { ...d, spent: round2(base * 0.8 * wave(i)) }))
}

// Curva do mês: acumulado de exemplo até hoje e a projeção (com a faixa)
// daqui até o fim, no ritmo de ~85% do planejado.
export function sampleMonthSeries(series: MonthSeriesPoint[], variablePlanned: number): MonthSeriesPoint[] {
  const days = series.length || 1
  const perDay = ((variablePlanned > 0 ? variablePlanned : 2000) / days) * 0.85
  const lastReal = series.reduce((last, p, i) => (p.cumulativeSpent !== null ? i : last), -1)
  let acc = 0
  const out: MonthSeriesPoint[] = []
  for (let i = 0; i < series.length; i++) {
    const p = series[i]
    if (i <= lastReal) {
      acc += perDay * wave(i)
      out.push({ ...p, cumulativeSpent: round2(acc), projected: i === lastReal ? round2(acc) : null, projectedLow: null, projectedHigh: null })
    } else {
      const ahead = (i - lastReal) * perDay
      const projected = round2(acc + ahead)
      out.push({ ...p, cumulativeSpent: null, projected, projectedLow: round2(acc + ahead * 0.85), projectedHigh: round2(acc + ahead * 1.15) })
    }
  }
  return out
}

export interface SampleTransaction {
  id: string
  description: string
  amount: number
  type: "expense"
  status: "paid"
  date: string
  categoryId: null
}

// Lançamentos de exemplo nos últimos 10 dias (para o gráfico de gastos por dia).
export function sampleTransactions(today: Date): SampleTransaction[] {
  const names = ["Mercado", "Padaria", "Uber", "iFood", "Farmácia", "Posto", "Cinema", "Mercado", "Café", "Uber", "iFood", "Feira"]
  return names.map((description, i) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (i % 10), 12)
    return {
      id: `sample-${i}`,
      description,
      amount: round2(25 + 40 * wave(i * 3)),
      type: "expense" as const,
      status: "paid" as const,
      date: day.toISOString(),
      categoryId: null,
    }
  })
}

export const SAMPLE_EXPLANATION = "Dados de exemplo para você ver como fica. Os seus aparecem aqui assim que você registrar."
