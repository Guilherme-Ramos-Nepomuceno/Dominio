// Divulgação progressiva: partes de uma tela que só fazem sentido com dados
// ficam escondidas no primeiro contato e "desbloqueiam" quando os dados
// chegam — com uma animação curta, um pequeno retorno de progresso. Enquanto
// bloqueadas, a tela mostra o que falta ("1 de 3 dias com gasto"). Lógica
// pura — testável com node:test. O que já foi anunciado fica no progresso do
// guiado (roteiro "unlocks"), para a animação acontecer uma vez só.

export const UNLOCKS_TOUR = "unlocks"

export type UnlockScreen = "week" | "home"

export interface UnlockStatus {
  id: string
  title: string
  // O que libera, enquanto bloqueado.
  hint: string
  unlocked: boolean
  // Progresso até liberar (ex.: 1 de 3 dias com gasto), quando faz sentido.
  progress: { current: number; target: number } | null
}

const clampProgress = (current: number, target: number) => ({ current: Math.min(current, target), target })

// --- Minha semana ---

// Dias do período em que o gasto acumulado subiu (houve gasto naquele dia).
export function daysWithSpending(series: Array<{ cumulativeSpent: number | null }>): number {
  let previous = 0
  let days = 0
  for (const point of series) {
    if (point.cumulativeSpent === null) continue
    if (point.cumulativeSpent > previous + 0.004) days++
    previous = point.cumulativeSpent
  }
  return days
}

// Dias com gasto para a projeção do mês fazer sentido.
export const PROJECTION_UNLOCK_DAYS = 3

export interface WeekUnlockInput {
  daysWithSpending: number
  completedWeeks: number
  categoriesThisWeek: number
  hasLastWeek: boolean
}

export function weekUnlocks(input: WeekUnlockInput): UnlockStatus[] {
  return [
    {
      id: "week-categories",
      title: "Para onde foi",
      hint: "Registre um gasto nesta semana para ver para onde o dinheiro foi.",
      unlocked: input.categoriesThisWeek > 0,
      progress: null,
    },
    {
      id: "week-projection",
      title: "Projeção do mês",
      hint: "Registre gastos em 3 dias diferentes e mostramos como o mês deve terminar.",
      unlocked: input.daysWithSpending >= PROJECTION_UNLOCK_DAYS,
      progress: clampProgress(input.daysWithSpending, PROJECTION_UNLOCK_DAYS),
    },
    {
      id: "week-weeks",
      title: "Semanas do mês",
      hint: "Feche a primeira semana para comparar uma semana com a outra.",
      unlocked: input.completedWeeks > 0,
      progress: null,
    },
    {
      id: "week-history",
      title: "Sequência no azul",
      hint: "Depois da primeira semana, acompanhamos quantas você fecha dentro do limite.",
      unlocked: input.hasLastWeek,
      progress: null,
    },
  ]
}

// --- Home ---

export interface HomeUnlockInput {
  spentThisWeek: number
  expensesThisMonth: number
}

export function homeUnlocks(input: HomeUnlockInput): UnlockStatus[] {
  return [
    {
      id: "home-week-so-far",
      title: "Sua semana até agora",
      hint: "Registre o primeiro gasto da semana.",
      unlocked: input.spentThisWeek > 0,
      progress: null,
    },
    {
      id: "home-daily",
      title: "Gastos por dia",
      hint: "Registre o primeiro gasto do mês.",
      unlocked: input.expensesThisMonth > 0,
      progress: null,
    },
  ]
}

// --- O que anunciar ---

export function initMarker(screen: UnlockScreen): string {
  return `_init-${screen}`
}

// Primeira visita à tela (sem o marcador): o que já está liberado entra sem
// festa (quem já usa o app não vê uma chuva de animações) e o marcador é
// gravado. Depois disso, o que passar a liberar é anunciado uma vez.
export function unlockTransitions(
  screen: UnlockScreen,
  statuses: UnlockStatus[],
  acked: string[],
): { silentAck: string[]; announce: string[] } {
  const seen = new Set(acked)
  const unlocked = statuses.filter((s) => s.unlocked).map((s) => s.id)
  if (!seen.has(initMarker(screen))) {
    return { silentAck: [...unlocked.filter((id) => !seen.has(id)), initMarker(screen)], announce: [] }
  }
  return { silentAck: [], announce: unlocked.filter((id) => !seen.has(id)) }
}

export function unlockedTitle(title: string): string {
  return `${title} liberado`
}
