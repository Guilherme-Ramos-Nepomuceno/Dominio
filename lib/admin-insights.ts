// Como a tela de admin conta a história dos dados: rótulos, a frase do maior
// abandono, a comparação com a semana anterior. Lógica pura — testável.

import type { ActivityStatus, AdminOverview } from "./admin.ts"

export const STATUS_LABEL: Record<ActivityStatus, string> = {
  ACTIVE: "Ativa",
  COOLING: "Esfriando",
  STOPPED: "Parou",
  NEVER: "Nunca voltou",
}

export const STATUS_HINT: Record<ActivityStatus, string> = {
  ACTIVE: "usou nos últimos 7 dias",
  COOLING: "sem usar há 8 a 21 dias",
  STOPPED: "sem usar há mais de 21 dias",
  NEVER: "criou a conta e não usou",
}

// Onde a pessoa parou (a última etapa do funil que cumpriu).
export const STAGE_LABEL: Record<string, string> = {
  SIGNED_UP: "Só criou a conta",
  OPENED: "Abriu, sem registrar",
  FIRST_TRANSACTION: "Registra, sem plano",
  PLAN_CONFIRMED: "Planejou, 1 semana",
  RETURNED: "Voltou, < 4 semanas",
  HABIT: "Hábito (4+ semanas)",
}

export const ACTION_LABEL: Record<string, string> = {
  transaction_quick: "Registro rápido",
  transaction_form: "Registro pelo formulário",
  inbox_categorized: "Classificou na caixa de entrada",
  plan_confirmed: "Confirmou o plano",
  wish_created: "Criou um desejo",
  wish_bought: "Comprou um desejo",
  wish_to_goal: "Desejo virou objetivo",
  rule_created: "Criou uma regra",
  week_leftover_saved: "Guardou a sobra da semana",
  month_closed: "Fechou o mês",
  push_enabled: "Ativou os avisos",
}

export const TOUR_LABEL: Record<string, string> = {
  plan: "Montar o plano",
  week: "Minha semana",
  home: "Home",
  inbox: "Caixa de entrada",
}

const STEP_LABEL: Record<string, string> = {
  budget: "Orçamento",
  "group-ESSENTIALS": "Essenciais",
  "group-LIFESTYLE": "Estilo de vida",
  "group-FUTURE": "Futuro",
  margin: "Sobra",
  wish: "Desejo",
  confirm: "Confirmar",
  available: "Disponível",
  days: "Valor por dia",
  notify: "Avisos",
  today: "Número do dia",
  add: "Botão +",
  accept: "Aceitar sugestão",
}

export function stepLabel(step: string): string {
  return STEP_LABEL[step] ?? step
}

// "+4 sobre a semana anterior" / "−2 ..." / "igual à semana anterior".
export function weekDelta(current: number, previous: number): { text: string; up: boolean | null } {
  const diff = current - previous
  if (diff === 0) return { text: "igual à semana anterior", up: null }
  return { text: `${diff > 0 ? "+" : "−"}${Math.abs(diff)} sobre a semana anterior`, up: diff > 0 }
}

export function percent(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

// A etapa em que mais gente fica pelo caminho (em número de pessoas).
export function biggestDrop(funnel: AdminOverview["funnel"]): { from: string; to: string; lost: number; pct: number } | null {
  let best: { from: string; to: string; lost: number; pct: number } | null = null
  for (let i = 1; i < funnel.length; i++) {
    const lost = funnel[i - 1].count - funnel[i].count
    if (lost > 0 && (!best || lost > best.lost)) {
      best = { from: funnel[i - 1].label, to: funnel[i].label, lost, pct: percent(lost, funnel[i - 1].count) }
    }
  }
  return best
}

export function biggestDropText(funnel: AdminOverview["funnel"]): string {
  const drop = biggestDrop(funnel)
  if (!drop) return "Ninguém ficou pelo caminho até agora."
  const people = drop.lost === 1 ? "1 pessoa para" : `${drop.lost} pessoas param`
  return `O maior abandono é entre "${drop.from}" e "${drop.to}": ${people} ali (${drop.pct}%).`
}

const DAY_MS = 24 * 60 * 60 * 1000

// "hoje", "ontem", "há 5 dias", "há 3 semanas", "nunca".
export function lastSeenLabel(iso: string | null, now: Date): string {
  if (!iso) return "nunca"
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(new Date(iso))) / DAY_MS)
  if (days <= 0) return "hoje"
  if (days === 1) return "ontem"
  if (days < 14) return `há ${days} dias`
  if (days < 60) return `há ${Math.floor(days / 7)} semanas`
  return `há ${Math.floor(days / 30)} meses`
}

// "Semana de 3/11".
export function weekLabel(weekStart: string): string {
  const [, m, d] = weekStart.split("-").map(Number)
  return `${d}/${m}`
}

// --- Eventos brutos em português ---

export const EVENT_LABEL: Record<string, string> = {
  app_opened: "Abriu o app",
  screen_viewed: "Viu uma tela",
  quick_add_opened: "Abriu o registro rápido",
  transaction_created: "Registrou um lançamento",
  inbox_viewed: "Abriu a caixa de entrada",
  inbox_categorized: "Classificou na caixa de entrada",
  plan_viewed: "Abriu o plano",
  plan_confirmed: "Confirmou o plano",
  plan_confirmed_negative_margin: "Confirmou o plano no negativo",
  plan_confirmed_summary_viewed: "Viu o resumo do plano",
  wish_created: "Criou um desejo",
  wish_bought: "Comprou um desejo",
  wish_to_goal: "Desejo virou objetivo",
  week_viewed: "Abriu Minha semana",
  week_closed_celebrated: "Fechou a semana no azul",
  week_leftover_saved: "Guardou a sobra da semana",
  month_closed: "Fechou o mês",
  push_enabled: "Ativou os avisos",
  rule_created: "Criou uma regra",
  wins_viewed: "Viu as vitórias",
  home_week_opened: "Abriu a semana pela Home",
  home_plan_opened: "Abriu o plano pela Home",
  guide_step_shown: "Viu uma dica",
  guide_finished: "Concluiu o guiado",
  guide_skipped: "Pulou o guiado",
  guide_replayed: "Reviu as dicas",
  feature_unlocked: "Desbloqueou uma parte",
  onboarding_finished: "Concluiu o onboarding (antigo)",
  onboarding_skipped: "Pulou o onboarding (antigo)",
  pluggy_auto_sync: "Sincronização automática (app)",
  pluggy_sync_completed: "Sincronizou com o banco",
  pluggy_sync_skipped: "Sincronização pulada",
  pluggy_sync_failed: "Falha na sincronização",
}

export function eventLabel(name: string): string {
  return EVENT_LABEL[name] ?? name.replace(/_/g, " ")
}

const UNLOCK_LABEL: Record<string, string> = {
  "week-categories": "Para onde foi",
  "week-projection": "Projeção do mês",
  "week-weeks": "Semanas do mês",
  "week-history": "Sequência no azul",
  "home-week-so-far": "Sua semana até agora",
  "home-daily": "Gastos por dia",
}

const SYNC_REASON: Record<string, string> = {
  RECENT: "sincronizou há pouco",
  RUNNING: "outra já estava rodando",
  NO_CONNECTION: "sem banco conectado",
  ITEM_ERROR: "erro no banco",
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// O que importa das propriedades, em palavras. Sem nada a dizer: "".
export function eventDetails(name: string, props: Record<string, unknown> | null, screenName: (key: string) => string): string {
  if (!props) return ""
  const p = props as Record<string, any>
  const parts: string[] = []
  switch (name) {
    case "screen_viewed":
      if (p.screen) parts.push(screenName(String(p.screen)))
      break
    case "transaction_created":
      parts.push(p.source === "quick" ? "registro rápido" : p.source === "form" ? "formulário" : String(p.source ?? ""))
      break
    case "inbox_categorized":
      if (typeof p.count === "number") parts.push(plural(p.count, "lançamento", "lançamentos"))
      if (p.acceptedSuggestion === true) parts.push("com a sugestão")
      else if (p.acceptedSuggestion === false) parts.push("escolheu outra")
      break
    case "guide_step_shown":
    case "guide_finished":
    case "guide_skipped":
    case "guide_replayed":
      if (p.tour) parts.push(TOUR_LABEL[p.tour] ?? String(p.tour))
      if (p.step) parts.push(stepLabel(String(p.step)))
      break
    case "feature_unlocked":
      if (p.id) parts.push(UNLOCK_LABEL[p.id] ?? String(p.id))
      break
    case "pluggy_sync_completed":
      parts.push(p.auto ? "automática" : "manual")
      if (typeof p.imported === "number") parts.push(plural(p.imported, "novo", "novos"))
      break
    case "pluggy_sync_skipped":
    case "pluggy_sync_failed":
    case "pluggy_auto_sync":
      if (p.reason) parts.push(SYNC_REASON[p.reason] ?? String(p.reason))
      if (typeof p.created === "number" && p.created > 0) parts.push(plural(p.created, "novo", "novos"))
      break
    case "plan_confirmed":
      if (p.onboarding) parts.push("no onboarding")
      if (typeof p.wishes === "number") parts.push(plural(p.wishes, "desejo", "desejos"))
      break
    case "wins_viewed":
      if (typeof p.count === "number") parts.push(plural(p.count, "vitória", "vitórias"))
      if (p.scope) parts.push(p.scope === "week" ? "da semana" : "do mês")
      break
    case "week_leftover_saved":
      if (p.destination) parts.push(p.destination === "WISH" ? "para os desejos" : p.destination === "GOAL" ? "para um objetivo" : "para uma reserva")
      break
    default:
      for (const [key, value] of Object.entries(p)) {
        if (value === null || value === undefined || typeof value === "object") continue
        parts.push(typeof value === "boolean" ? (value ? key : `sem ${key}`) : `${key} ${value}`)
      }
  }
  return parts.filter(Boolean).join(" · ")
}

// --- Período do filtro de eventos ---

export type PeriodPreset = "all" | "today" | "7d" | "30d" | "custom"

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

// Atalho → datas do filtro (YYYY-MM-DD, inclusivas). "custom" usa as datas
// escolhidas no calendário; "all" não filtra.
export function presetRange(preset: PeriodPreset, today: Date): { from: string; to: string } {
  const back = (days: number) => isoDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() - days))
  switch (preset) {
    case "today":
      return { from: isoDay(today), to: isoDay(today) }
    case "7d":
      return { from: back(6), to: isoDay(today) }
    case "30d":
      return { from: back(29), to: isoDay(today) }
    default:
      return { from: "", to: "" }
  }
}

// "3 nov – 9 nov" / "a partir de 3 nov" / "Período".
export function rangeLabel(from: string, to: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number)
    return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "").replace(" de ", " ")
  }
  if (from && to) return from === to ? fmt(from) : `${fmt(from)} – ${fmt(to)}`
  if (from) return `a partir de ${fmt(from)}`
  if (to) return `até ${fmt(to)}`
  return "Período"
}

// Dia do calendário (YYYY-MM-DD) → início/fim do dia no horário local (ISO).
export function dayBoundary(day: string, edge: "start" | "end"): string {
  const [y, m, d] = day.split("-").map(Number)
  if (!y || !m || !d) return day
  return (edge === "start" ? new Date(y, m - 1, d) : new Date(y, m - 1, d, 23, 59, 59, 999)).toISOString()
}
