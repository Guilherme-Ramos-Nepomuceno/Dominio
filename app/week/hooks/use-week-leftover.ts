"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { saveWeekLeftover } from "@/lib/planning-api"
import { useGoalsQuery, useSavingsGoalsQuery } from "@/hooks/queries"
import { parseMonthKey } from "@/lib/period"
import { trackEvent } from "@/lib/events"
import type { WeekSaveDestination } from "@/lib/week"
import { toast } from "@/hooks/use-toast"

export interface LeftoverTarget {
  id: string
  name: string
}

// Sobra da semana com um toque: desejos vão direto; objetivo e reserva abrem a
// lista (do cache, buscada só quando a pessoa escolhe) e um toque no item guarda.
export function useWeekLeftover(monthKey: string) {
  const [picking, setPicking] = useState<"GOAL" | "SAVINGS" | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const goalsQuery = useGoalsQuery({ enabled: picking === "GOAL" })
  const savingsQuery = useSavingsGoalsQuery({ enabled: picking === "SAVINGS" })
  const active = picking === "GOAL" ? goalsQuery : picking === "SAVINGS" ? savingsQuery : null
  const list = active?.data
  const failed = !!active?.isError && !list
  // null = carregando; falha vira lista vazia (com o aviso abaixo).
  const targets = useMemo<LeftoverTarget[] | null>(() => {
    if (!picking) return null
    if (list) return list.map((t) => ({ id: t.id, name: t.name }))
    return failed ? [] : null
  }, [picking, list, failed])

  const loadError = failed ? active?.error : null
  useEffect(() => {
    if (loadError) {
      toast({ title: "Não foi possível carregar a lista", description: (loadError as any)?.message, variant: "destructive" })
    }
  }, [loadError])

  const pick = useCallback((destination: "GOAL" | "SAVINGS") => {
    setPicking(destination)
  }, [])

  const save = useCallback(
    async (destination: WeekSaveDestination, id?: string) => {
      const { year, month } = parseMonthKey(monthKey)
      setIsBusy(true)
      try {
        await saveWeekLeftover(year, month, { destination, id })
        trackEvent("week_leftover_saved", { destination })
        setPicking(null)
      } catch (error: any) {
        toast({ title: "Não foi possível guardar a sobra", description: error?.message, variant: "destructive" })
      } finally {
        setIsBusy(false)
      }
    },
    [monthKey],
  )

  return { picking, targets, isBusy, pick, cancelPick: () => setPicking(null), save }
}
