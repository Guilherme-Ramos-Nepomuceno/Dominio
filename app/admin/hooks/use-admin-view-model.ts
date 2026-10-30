"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getAdminEvents, getAdminMe, getAdminMetrics, type AdminEvent, type AdminMetrics } from "@/lib/admin"
import type { EventName } from "@/lib/events"

export const EVENT_NAMES: EventName[] = [
  "app_opened",
  "quick_add_opened",
  "transaction_created",
  "inbox_viewed",
  "inbox_categorized",
  "pluggy_auto_sync",
]

export interface EventFilterState {
  name: string // "" = todos
  from: string
  to: string
}

export function useAdminViewModel() {
  const router = useRouter()
  // null = ainda verificando; a tela não renderiza nada até confirmar.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [metricsError, setMetricsError] = useState(false)
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState(false)
  const [filter, setFilter] = useState<EventFilterState>({ name: "", from: "", to: "" })

  const loadEvents = useCallback(async (f: EventFilterState) => {
    setEventsLoading(true)
    try {
      setEvents(await getAdminEvents({ name: f.name || undefined, from: f.from || undefined, to: f.to || undefined, limit: 100 }))
      setEventsError(false)
    } catch {
      setEventsError(true)
    } finally {
      setEventsLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    getAdminMe().then((ok) => {
      if (cancelled) return
      if (!ok) {
        router.replace("/")
        return
      }
      setIsAdmin(true)
      getAdminMetrics(8)
        .then((m) => !cancelled && setMetrics(m))
        .catch(() => !cancelled && setMetricsError(true))
      loadEvents({ name: "", from: "", to: "" })
    })
    return () => {
      cancelled = true
    }
  }, [router, loadEvents])

  return {
    isAdmin,
    metrics,
    metricsError,
    events,
    eventsLoading,
    eventsError,
    filter,
    setFilter,
    applyFilter: () => loadEvents(filter),
    clearFilter: () => {
      const empty = { name: "", from: "", to: "" }
      setFilter(empty)
      loadEvents(empty)
    },
  }
}
