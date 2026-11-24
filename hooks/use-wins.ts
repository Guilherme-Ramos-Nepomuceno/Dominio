"use client"

import { useCallback } from "react"
import { useWinsQuery } from "@/hooks/queries"
import { getActiveAccountSelection } from "@/lib/active-account"
import { parseMonthKey, toISODate } from "@/lib/period"

// Vitórias do mês `monthKey` com a semana de hoje (GET /plans/:y/:m/wins).
// Usado por Minha semana e Planejar mês; vem do cache e se atualiza junto com
// transações e plano (invalidação do domínio "plan"). Falha aqui nunca derruba
// a tela: sem dados, as telas só não mostram as vitórias.
export function useWins(monthKey: string, enabled = true) {
  const active = enabled && getActiveAccountSelection().type !== "partner"
  const { year, month } = parseMonthKey(monthKey)
  const query = useWinsQuery(year, month, toISODate(new Date()), { enabled: active })

  const { refetch } = query
  const reload = useCallback(async () => {
    if (active) await refetch()
  }, [active, refetch])

  return {
    wins: active ? (query.data ?? null) : null,
    isLoading: active && query.isPending,
    reload,
  }
}
