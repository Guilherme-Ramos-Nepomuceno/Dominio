"use client"

import { useCallback, useEffect, useState } from "react"
import { getPluggyPendingCount } from "@/lib/storage"

// Mesmo padrão de usePendingSummary (hooks/use-transactions.ts) — reage ao
// evento global "storage-update" pra manter o sino de notificação em dia sem
// precisar de polling.
export function usePluggyPendingSummary() {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setCount(await getPluggyPendingCount())
    setLoading(false)
  }, [])

  useEffect(() => {
    load()

    const handleStorageUpdate = () => load()
    window.addEventListener("storage-update", handleStorageUpdate)
    return () => window.removeEventListener("storage-update", handleStorageUpdate)
  }, [load])

  return { count, loading }
}
