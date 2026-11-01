"use client"

import { useEffect } from "react"

// Registra o service worker (instalação do PWA e push). Sem cache de páginas.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("Não foi possível registrar o service worker:", error)
    })
  }, [])
  return null
}
