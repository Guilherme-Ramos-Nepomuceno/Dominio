"use client"

import { useCallback, useState } from "react"
import { saveWeekLeftover } from "@/lib/planning-api"
import { getGoals, getSavingsGoals } from "@/lib/storage"
import { parseMonthKey } from "@/lib/period"
import { trackEvent } from "@/lib/events"
import type { WeekSaveDestination } from "@/lib/week"
import { toast } from "@/hooks/use-toast"

export interface LeftoverTarget {
  id: string
  name: string
}

// Sobra da semana com um toque: desejos vão direto; objetivo e reserva abrem a
// lista (carregada só quando a pessoa escolhe) e um toque no item guarda.
export function useWeekLeftover(monthKey: string) {
  const [picking, setPicking] = useState<"GOAL" | "SAVINGS" | null>(null)
  const [targets, setTargets] = useState<LeftoverTarget[] | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const pick = useCallback(async (destination: "GOAL" | "SAVINGS") => {
    setPicking(destination)
    setTargets(null)
    try {
      const list = destination === "GOAL" ? await getGoals() : await getSavingsGoals()
      setTargets(list.map((t) => ({ id: t.id, name: t.name })))
    } catch (error: any) {
      setTargets([])
      toast({ title: "Não foi possível carregar a lista", description: error?.message, variant: "destructive" })
    }
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
