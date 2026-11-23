"use client"

import { useCallback } from "react"
import { useInboxCountQuery } from "@/hooks/queries"
import { getActiveAccountSelection } from "@/lib/active-account"

// Quantas transações estão em "A classificar" (sem categoria). Vem do cache:
// registro rápido, categorização, importação, sync da Pluggy... invalidam o
// domínio "inbox" e o contador se atualiza sozinho. Falha silenciosa — o
// contador é só um atalho, não pode quebrar a tela se a API ainda não tiver o
// endpoint (erro = 0).
export function useInboxCount() {
  // Dados de um parceiro são somente leitura — não há o que classificar.
  const isPartner = getActiveAccountSelection().type === "partner"
  const query = useInboxCountQuery({ enabled: !isPartner })
  const count = isPartner ? 0 : (query.data ?? 0)

  const { refetch } = query
  const refresh = useCallback(async () => {
    if (!isPartner) await refetch()
  }, [isPartner, refetch])

  return { count, refresh }
}
