"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getWins } from "@/lib/planning-api"
import { getActiveAccountSelection } from "@/lib/active-account"
import { parseMonthKey, toISODate } from "@/lib/period"
import type { WinsData } from "@/lib/wins"

// Vitórias do mês `monthKey` com a semana de hoje (GET /plans/:y/:m/wins).
// Usado por Minha semana e Planejar mês; recarrega junto com transações e
// plano. Falha aqui nunca derruba a tela: sem dados, as telas só não mostram
// as vitórias.
export function useWins(monthKey: string, enabled = true) {
  const [wins, setWins] = useState<WinsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const seq = useRef(0)

  const load = useCallback(async () => {
    if (!enabled || getActiveAccountSelection().type === "partner") {
      setIsLoading(false)
      return
    }
    const current = ++seq.current
    try {
      const { year, month } = parseMonthKey(monthKey)
      const result = await getWins(year, month, toISODate(new Date()))
      if (current === seq.current) setWins(result)
    } catch (error) {
      if (current === seq.current) console.error("Falha ao carregar as vitórias:", error)
    } finally {
      if (current === seq.current) setIsLoading(false)
    }
  }, [monthKey, enabled])

  useEffect(() => {
    setWins(null)
    setIsLoading(true)
    load()
    window.addEventListener("storage-update", load)
    window.addEventListener("plan-update", load)
    return () => {
      window.removeEventListener("storage-update", load)
      window.removeEventListener("plan-update", load)
    }
  }, [load])

  return { wins, isLoading, reload: load }
}
