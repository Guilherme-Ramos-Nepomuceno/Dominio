"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { usePathname } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { getGuide, patchGuide, type GuidePatch } from "@/lib/guide-api"
import { EMPTY_TOUR, canShowTour, type GuideState, type GuideTourState } from "@/lib/guide"
import { trackEvent } from "@/lib/events"

interface GuideContextValue {
  // null enquanto carrega (ou sem sessão): nenhuma dica aparece.
  state: GuideState | null
  ack: (tour: string, step: string) => void
  skip: (tour: string, step: string) => void
  finish: (tour: string) => void
  reset: (tour: string) => void
  // Revendo as dicas de uma tela (Configurações → Dicas): só nesta sessão,
  // sem mexer no progresso salvo. `acked` = passos já vistos na revisão.
  replay: Replay | null
  // Abre a revisão; ela termina ao concluir, ao sair do guia ou ao sair da tela.
  startReplay: (tour: string, href: string) => void
  ackReplay: (step: string) => void
  endReplay: () => void
  // Marca passos sem mostrar nada (desbloqueios já liberados na 1ª visita).
  ackSilently: (tour: string, steps: string[]) => void
  // Um roteiro por visita: o primeiro que aparece reserva a sessão.
  canShow: (tour: string) => boolean
  claim: (tour: string) => void
}

const SESSION_TOUR_KEY = "dominio:guide-session-tour"

interface Replay {
  tour: string
  acked: string[]
  href: string
  // Já chegou na tela da revisão (sair dela depois encerra a revisão).
  arrived: boolean
}

function readClaim(): string | null {
  try {
    return sessionStorage.getItem(SESSION_TOUR_KEY)
  } catch {
    return null
  }
}

const GuideContext = createContext<GuideContextValue | null>(null)

function applyLocal(state: GuideState, patch: GuidePatch): GuideState {
  const current: GuideTourState = patch.reset ? EMPTY_TOUR : (state[patch.tour] ?? EMPTY_TOUR)
  const acked = Array.from(new Set([...current.acked, ...(patch.ack ?? [])]))
  return {
    ...state,
    [patch.tour]: { acked, done: patch.done ?? current.done, skipped: patch.skipped ?? current.skipped },
  }
}

// Progresso do guiado da pessoa que fez login. Carrega uma vez por sessão
// (recarrega ao trocar de usuário) e grava cada mudança na API de forma
// otimista — se a gravação falhar, a dica no máximo volta a aparecer depois.
export function GuideProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [state, setState] = useState<GuideState | null>(null)
  const [claimed, setClaimed] = useState<string | null>(null)
  const [replay, setReplay] = useState<Replay | null>(null)

  // A revisão vale enquanto a pessoa está na tela dela.
  useEffect(() => {
    setReplay((r) => {
      if (!r) return r
      if (pathname === r.href) return r.arrived ? r : { ...r, arrived: true }
      return r.arrived ? null : r
    })
  }, [pathname])
  const loadedFor = useRef<string | null>(null)

  useEffect(() => {
    setClaimed(readClaim())
  }, [])

  const load = useCallback(() => {
    const user = getCurrentUser()
    if (!user) {
      loadedFor.current = null
      setState(null)
      return
    }
    if (loadedFor.current === user.id) return
    loadedFor.current = user.id
    getGuide()
      .then((s) => {
        if (loadedFor.current === user.id) setState(s)
      })
      .catch(() => {
        // Sem progresso (API fora do ar): melhor não mostrar dica nenhuma.
        loadedFor.current = null
      })
  }, [])

  // Login/cadastro trocam de tela sem evento: confere a cada navegação.
  useEffect(() => {
    load()
  }, [load, pathname])

  useEffect(() => {
    const onAuthChange = () => {
      loadedFor.current = null
      setState(null)
      load()
    }
    window.addEventListener("auth-change", onAuthChange)
    return () => window.removeEventListener("auth-change", onAuthChange)
  }, [load])

  const send = useCallback((patch: GuidePatch) => {
    setState((s) => (s ? applyLocal(s, patch) : s))
    patchGuide(patch).catch(() => {})
  }, [])

  const value = useMemo<GuideContextValue>(
    () => ({
      state,
      ack: (tour, step) => send({ tour, ack: [step] }),
      skip: (tour, step) => {
        trackEvent("guide_skipped", { tour, step })
        send({ tour, skipped: true })
      },
      finish: (tour) => {
        trackEvent("guide_finished", { tour })
        send({ tour, done: true })
      },
      reset: (tour) => send({ tour, reset: true }),
      replay,
      startReplay: (tour, href) => {
        trackEvent("guide_replayed", { tour })
        setReplay({ tour, acked: [], href, arrived: false })
      },
      ackReplay: (step) => setReplay((r) => (r ? { ...r, acked: [...r.acked, step] } : r)),
      endReplay: () => setReplay(null),
      ackSilently: (tour, steps) => {
        if (steps.length > 0) send({ tour, ack: steps })
      },
      // Revendo uma tela, só ela mostra dica.
      canShow: (tour) => (replay ? replay.tour === tour : canShowTour(claimed, tour)),
      claim: (tour) => {
        if (claimed !== null) return
        try {
          sessionStorage.setItem(SESSION_TOUR_KEY, tour)
        } catch {
          // idem
        }
        setClaimed(tour)
      },
    }),
    [state, send, claimed, replay],
  )

  return <GuideContext.Provider value={value}>{children}</GuideContext.Provider>
}

export function useGuide(): GuideContextValue {
  const ctx = useContext(GuideContext)
  if (!ctx) throw new Error("useGuide precisa estar dentro de GuideProvider")
  return ctx
}
