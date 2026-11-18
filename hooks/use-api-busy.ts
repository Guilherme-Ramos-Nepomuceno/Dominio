"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { pendingRequests, remainingBusyMs, subscribeRequests } from "@/lib/api-activity"

// Carregamento rápido já tem o skeleton da tela: o D só anima depois disso.
const START_DELAY_MS = 300
// Uma vez animando, fica pelo menos um tempo, para não piscar.
const MIN_VISIBLE_MS = 1200

// true enquanto o D da marca deve animar (chamadas à API em andamento).
export function useApiBusy(): boolean {
  const pending = useSyncExternalStore(subscribeRequests, pendingRequests, () => 0) > 0
  const [busy, setBusy] = useState(false)
  const startedAt = useRef(0)

  useEffect(() => {
    if (pending && !busy) {
      const timer = setTimeout(() => {
        startedAt.current = Date.now()
        setBusy(true)
      }, START_DELAY_MS)
      return () => clearTimeout(timer)
    }
    if (!pending && busy) {
      const timer = setTimeout(() => setBusy(false), remainingBusyMs(startedAt.current, Date.now(), MIN_VISIBLE_MS))
      return () => clearTimeout(timer)
    }
  }, [pending, busy])

  return busy
}
