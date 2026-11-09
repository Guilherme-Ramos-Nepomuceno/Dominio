"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getAdminEvents,
  getAdminMe,
  getAdminMetrics,
  getAdminOverview,
  type ActivityStatus,
  type AdminEvent,
  type AdminMetrics,
  type AdminOverview,
} from "@/lib/admin"
import { biggestDropText, presetRange, weekDelta, type PeriodPreset } from "@/lib/admin-insights"


export interface EventFilterState {
  name: string // "" = todos
  preset: PeriodPreset
  from: string // YYYY-MM-DD ("" = sem limite)
  to: string
}

const EMPTY_FILTER: EventFilterState = { name: "", preset: "all", from: "", to: "" }

export type PersonFilter = ActivityStatus | "ALL"

const WEEKS = 8

export function useAdminViewModel() {
  const router = useRouter()
  // null = ainda verificando; a tela não renderiza nada até confirmar.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [personFilter, setPersonFilter] = useState<PersonFilter>("ALL")
  const [showAllPersons, setShowAllPersons] = useState(false)

  // Eventos brutos: só carregam quando a seção é aberta.
  const [rawOpen, setRawOpen] = useState(false)
  const [events, setEvents] = useState<AdminEvent[] | null>(null)
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsError, setEventsError] = useState(false)
  const [filter, setFilter] = useState<EventFilterState>(EMPTY_FILTER)

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

  const load = useCallback(() => {
    setLoadError(false)
    Promise.all([getAdminOverview(WEEKS), getAdminMetrics(WEEKS)])
      .then(([o, m]) => {
        setOverview(o)
        setMetrics(m)
      })
      .catch(() => setLoadError(true))
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
      load()
    })
    return () => {
      cancelled = true
    }
  }, [router, load])

  const applyFilter = useCallback(
    (next: EventFilterState) => {
      setFilter(next)
      loadEvents(next)
    },
    [loadEvents],
  )

  // Primeiro nome de quem fez o evento (vem da lista de pessoas do painel).
  const names = useMemo(() => new Map((overview?.persons ?? []).map((p) => [p.id, p.firstName])), [overview])
  const personName = useCallback((userId: string) => names.get(userId) ?? null, [names])

  const toggleRaw = useCallback(() => {
    setRawOpen((open) => {
      if (!open && events === null) loadEvents(filter)
      return !open
    })
  }, [events, filter, loadEvents])

  const derived = useMemo(() => {
    if (!overview) return null
    const p = overview.people
    return {
      delta: weekDelta(p.active7d, p.activePrev7d),
      dropText: biggestDropText(overview.funnel),
      signups: overview.funnel[0]?.count ?? 0,
      persons: personFilter === "ALL" ? overview.persons : overview.persons.filter((x) => x.status === personFilter),
    }
  }, [overview, personFilter])

  return {
    isAdmin,
    overview,
    metrics,
    loadError,
    reload: load,
    derived,
    personFilter,
    setPersonFilter,
    showAllPersons,
    setShowAllPersons,
    rawOpen,
    toggleRaw,
    events,
    eventsLoading,
    eventsError,
    filter,
    // O filtro aplica na hora.
    setEventName: (name: string) => applyFilter({ ...filter, name }),
    setPreset: (preset: PeriodPreset) => applyFilter({ ...filter, preset, ...presetRange(preset, new Date()) }),
    setRange: (from: string, to: string) => applyFilter({ ...filter, preset: "custom", from, to }),
    personName,
  }
}
