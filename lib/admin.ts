// Painel admin (métricas de produto da Fase 1). Endpoints só respondem para
// usuários admin no backend — o front só esconde a tela/links de quem não é.

import { fetchApi } from "./api"

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
  if (filter.from) params.set("from", filter.from)
  if (filter.to) params.set("to", filter.to)
  params.set("limit", String(filter.limit ?? 100))
  const result = await fetchApi(`/admin/events?${params.toString()}`)
  return Array.isArray(result) ? result : []
}
