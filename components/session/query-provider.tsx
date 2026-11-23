"use client"

import { useEffect, useState, type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { getQueryClient } from "@/lib/query-client"

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(getQueryClient)

  useEffect(() => {
    // Ponte com o mecanismo antigo: toda gravação em lib/storage.ts (e o sync
    // do Pluggy) dispara "storage-update". Enquanto as telas não migram para
    // invalidações específicas, qualquer mudança invalida o cache inteiro —
    // mesmo comportamento de antes (tudo recarrega), só que sem skeleton.
    //
    // queueMicrotask: o evento também limpa as leituras em andamento de
    // lib/storage.ts (readsInFlight). Invalidar depois de todos os ouvintes
    // rodarem garante que a nova busca não pegue carona numa requisição de
    // antes da gravação.
    const onStorageUpdate = () => queueMicrotask(() => void client.invalidateQueries())

    // Login, logout ou sessão expirada: o cache é da pessoa anterior. Apaga
    // tudo em vez de confiar só na chave por usuário.
    const onAuthChange = () => client.clear()

    window.addEventListener("storage-update", onStorageUpdate)
    window.addEventListener("auth-change", onAuthChange)
    return () => {
      window.removeEventListener("storage-update", onStorageUpdate)
      window.removeEventListener("auth-change", onAuthChange)
    }
  }, [client])

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
