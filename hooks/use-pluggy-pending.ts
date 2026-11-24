"use client"

import { usePluggyPendingCountQuery } from "@/hooks/queries"

// Contador do sino de notificação. Vem do cache: sync e confirmações da
// Pluggy invalidam o domínio e o número se atualiza sem polling.
export function usePluggyPendingSummary() {
  const query = usePluggyPendingCountQuery()
  // `loading` só no primeiro carregamento — revalidar não pisca o sino.
  return { count: query.data ?? 0, loading: query.isPending }
}
