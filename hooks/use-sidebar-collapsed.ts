"use client"

import { useCallback, useSyncExternalStore } from "react"

const STORAGE_KEY = "dominio:sidebar-collapsed"
const EVENT = "sidebar-collapsed-change"

// Cópia em memória: vale quando o navegador não deixa gravar (aba privada).
let memory = false

function read(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === null ? memory : stored === "1"
  } catch {
    return memory
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener("storage", onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener("storage", onChange)
  }
}

// Menu lateral do desktop recolhido (só ícones) ou aberto. Fica salvo no
// navegador; useSyncExternalStore faz o menu e o recuo do conteúdo lerem o
// mesmo valor já na montagem de cada tela, sem piscar ao navegar.
export function useSidebarCollapsed() {
  const collapsed = useSyncExternalStore(subscribe, read, () => false)

  const setCollapsed = useCallback((next: boolean) => {
    memory = next
    try {
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
    } catch {
      // Sem armazenamento (aba privada): só não lembra na próxima visita.
    }
    window.dispatchEvent(new Event(EVENT))
  }, [])

  const toggle = useCallback(() => setCollapsed(!read()), [setCollapsed])

  return { collapsed, setCollapsed, toggle }
}
