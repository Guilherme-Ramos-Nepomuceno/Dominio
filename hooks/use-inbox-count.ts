"use client"

import { useCallback, useEffect, useState } from "react"
import { getInboxCount } from "@/lib/storage"
import { getActiveAccountSelection } from "@/lib/active-account"

// Quantas transações estão em "A classificar" (sem categoria). Mesmo padrão
// de usePluggyPendingSummary: reage ao evento global "storage-update"
// (registro rápido, categorização, importação, sync da Pluggy...) em vez de
// fazer polling. Falha silenciosa — o contador é só um atalho, não pode
// quebrar a tela se a API ainda não tiver o endpoint.
export function useInboxCount() {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    // Dados de um parceiro são somente leitura — não há o que classificar.
    if (getActiveAccountSelection().type === "partner") {
      setCount(0)
      return
    }
    try {
      setCount(await getInboxCount())
    } catch {
      setCount(0)
    }
  }, [])

  useEffect(() => {
    load()
    window.addEventListener("storage-update", load)
    return () => window.removeEventListener("storage-update", load)
  }, [load])

  return { count, refresh: load }
}
