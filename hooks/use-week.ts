"use client"

import { useCallback } from "react"
import { useWeekQuery } from "@/hooks/queries"
import { getActiveAccountSelection } from "@/lib/active-account"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { parseMonthKey, toISODate } from "@/lib/period"

// Semana de hoje dentro do mês do plano atual (GET /plans/:y/:m/week).
// Usado pelo card da Home e pela tela Minha semana. Vem do cache: gravações
// de transações ou do plano invalidam o domínio "plan" e a semana se atualiza.
export function useWeek(enabled = true) {
  const { currentMonth } = useSelectedMonth()
  // Vendo um parceiro (somente leitura): o endpoint responderia pela própria conta.
  const active = enabled && getActiveAccountSelection().type !== "partner"
  const { year, month } = parseMonthKey(currentMonth)
  const query = useWeekQuery(year, month, toISODate(new Date()), { enabled: active })

  const { refetch } = query
  const reload = useCallback(async () => {
    if (active) await refetch()
  }, [active, refetch])

  return {
    week: active ? (query.data ?? null) : null,
    // Só no primeiro carregamento (consulta desligada nunca fica "carregando").
    isLoading: active && query.isPending,
    loadError: active && query.isError,
    reload,
  }
}
