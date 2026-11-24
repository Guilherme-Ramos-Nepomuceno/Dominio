"use client"

import { useEffect, useState, type ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { getQueryClient, invalidateDomains } from "@/lib/query-client"
import { CACHE_INVALIDATE_EVENT, STORAGE_UPDATE_EVENT, type DataChangeDetail } from "@/lib/data-events"

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(getQueryClient)

  useEffect(() => {
    // Toda gravação avisa dizendo qual domínio mexeu (lib/data-events.ts) —
    // invalida só as consultas que dependem dele (DOMAIN_INVALIDATES). Aviso
    // sem domínio (ex.: algum dispatch antigo de "storage-update") invalida
    // tudo.
    //
    // queueMicrotask: o evento também limpa as leituras em andamento de
    // lib/storage.ts (readsInFlight). Invalidar depois de todos os ouvintes
    // rodarem garante que a nova busca não pegue carona numa requisição de
    // antes da gravação.
    const onDataChange = (event: Event) => {
      const domains = (event as CustomEvent<DataChangeDetail | undefined>).detail?.domains
      queueMicrotask(() => void invalidateDomains(client, domains))
    }

    // Login, logout ou sessão expirada: o cache é da pessoa anterior. Apaga
    // tudo em vez de confiar só na chave por usuário.
    const onAuthChange = () => client.clear()

    window.addEventListener(STORAGE_UPDATE_EVENT, onDataChange)
    window.addEventListener(CACHE_INVALIDATE_EVENT, onDataChange)
    window.addEventListener("auth-change", onAuthChange)
    return () => {
      window.removeEventListener(STORAGE_UPDATE_EVENT, onDataChange)
      window.removeEventListener(CACHE_INVALIDATE_EVENT, onDataChange)
      window.removeEventListener("auth-change", onAuthChange)
    }
  }, [client])

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
