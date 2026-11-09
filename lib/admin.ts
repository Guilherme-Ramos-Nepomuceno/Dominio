// Painel admin (métricas de produto da Fase 1). Endpoints só respondem para
// usuários admin no backend — o front só esconde a tela/links de quem não é.

import { fetchApi } from "./api"
import { dayBoundary } from "./admin-insights"

export interface AdminWeeklyMetric {
  weekStart: string
  activeUsers: number
  newUsers: number
  transactionsCreated: number
  quickAdds: number
  inboxCategorized: number
}

export interface AdminMetrics {
  weekly: AdminWeeklyMetric[]
  inbox: {
    currentUncategorized: number
    avgUncategorizedPerUser: number
    categorizedWithin7DaysPct: number | null
  }
  suggestions: { acceptedPct: number | null }
  pluggy: {
    syncsLast7Days: number
    autoSyncsLast7Days: number
    skippedLast7Days: number
    failuresLast7Days: number
  }
}

export interface AdminEvent {
  id: string
  userId: string
  name: string
  properties: Record<string, unknown> | null
  createdAt: string
}

export interface AdminEventsFilter {
  name?: string
  from?: string // YYYY-MM-DD
  to?: string // YYYY-MM-DD
  limit?: number
}

export async function getAdminMe(): Promise<boolean> {
  try {
    const result = await fetchApi("/admin/me")
    return !!result?.isAdmin
  } catch {
    return false
  }
}

export async function getAdminMetrics(weeks = 8): Promise<AdminMetrics> {
  return fetchApi(`/admin/metrics?weeks=${weeks}`)
}

export async function getAdminEvents(filter: AdminEventsFilter = {}): Promise<AdminEvent[]> {
  const params = new URLSearchParams()
  if (filter.name) params.set("name", filter.name)
  // Dia do calendário (YYYY-MM-DD) → início/fim do dia no horário local; a API
  // leria "2026-11-09" como meia-noite UTC (21h do dia anterior no Brasil).
  if (filter.from) params.set("from", dayBoundary(filter.from, "start"))
  if (filter.to) params.set("to", dayBoundary(filter.to, "end"))
  params.set("limit", String(filter.limit ?? 100))
  const result = await fetchApi(`/admin/events?${params.toString()}`)
  return Array.isArray(result) ? result : []
}

// --- Visão geral (quem usa, o quê e onde para) ---

export type ActivityStatus = "ACTIVE" | "COOLING" | "STOPPED" | "NEVER"

export interface AdminOverview {
  generatedAt: string
  people: {
    total: number
    activeToday: number
    active7d: number
    activePrev7d: number
    active30d: number
    newLast7d: number
    byStatus: Record<ActivityStatus, number>
  }
  weekly: Array<{ weekStart: string; active: number; newUsers: number }>
  funnel: Array<{ key: string; label: string; count: number; stoppedHere: number }>
  guide: Array<{
    tour: string
    started: number
    finished: number
    skipped: number
    inProgress: number
    stoppedAt: Array<{ step: string; count: number }>
    skippedAt: Array<{ step: string; count: number }>
  }>
  screens: Array<{ screen: string; views: number; users: number }>
  actions: Array<{ key: string; count: number; users: number }>
  persons: Array<{
    id: string
    firstName: string
    maskedEmail: string
    createdAt: string
    lastSeen: string | null
    events30d: number
    weeksActive: number
    status: ActivityStatus
    stage: string
  }>
}

export async function getAdminOverview(weeks = 8): Promise<AdminOverview> {
  return fetchApi(`/admin/overview?weeks=${weeks}`)
}
