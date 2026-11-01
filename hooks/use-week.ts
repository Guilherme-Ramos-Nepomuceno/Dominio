"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getWeek } from "@/lib/planning-api"
import { getActiveAccountSelection } from "@/lib/active-account"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { parseMonthKey, toISODate } from "@/lib/period"
import type { WeekData } from "@/lib/week"

// Semana de hoje dentro do mês do plano atual (GET /plans/:y/:m/week).
// Usado pelo card da Home e pela tela Minha semana; recarrega quando
// transações ou o plano mudam.
export function useWeek(enabled = true) {
  const { currentMonth } = useSelectedMonth()
  const [week, setWeek] = useState<WeekData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const seq = useRef(0)

  const load = useCallback(async () => {
    // Vendo um parceiro (somente leitura): o endpoint responderia pela própria conta.
    if (!enabled || getActiveAccountSelection().type === "partner") {
      setIsLoading(false)
      return
    }
    const current = ++seq.current
    setLoadError(false)
    try {
      const { year, month } = parseMonthKey(currentMonth)
      const result = await getWeek(year, month, toISODate(new Date()))
      if (current === seq.current) setWeek(result)
    } catch (error) {
      if (current !== seq.current) return
      console.error("Falha ao carregar a semana:", error)
      setLoadError(true)
    } finally {
      if (current === seq.current) setIsLoading(false)
    }
  }, [currentMonth, enabled])

  useEffect(() => {
    load()
    window.addEventListener("storage-update", load)
    window.addEventListener("plan-update", load)
    return () => {
      window.removeEventListener("storage-update", load)
      window.removeEventListener("plan-update", load)
    }
  }, [load])

  return { week, isLoading, loadError, reload: load }
}
