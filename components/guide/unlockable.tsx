"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { LockSimpleOpen, Sparkle } from "@phosphor-icons/react"
import { useAccount } from "@/components/account/account-context"
import { useGuide } from "@/components/guide/guide-provider"
import { trackEvent } from "@/lib/events"
import { tourState } from "@/lib/guide"
import { UNLOCKS_TOUR, isUnlockedFor, lockedStatuses, unlockTransitions, unlockedTitle, type UnlockScreen, type UnlockStatus } from "@/lib/unlocks"

// Desbloqueios de uma tela. Na primeira visita grava sem festa o que já está
// liberado; depois, o que liberar é anunciado uma vez (e fica "novo" até a
// pessoa sair da tela). Fora da conta pessoal, tudo aparece normalmente.
export function useUnlocks(screen: UnlockScreen, statuses: UnlockStatus[] | null) {
  const guide = useGuide()
  const { selection } = useAccount()
  const personal = selection.type === "personal"
  const acked = guide.state ? tourState(guide.state, UNLOCKS_TOUR).acked : null
  // Anunciados nesta visita: continuam com o selo mesmo depois de gravados.
  const [fresh, setFresh] = useState<string[]>([])
  const sent = useRef(new Set<string>())

  const transitions = useMemo(
    () => (statuses && acked && personal ? unlockTransitions(screen, statuses, acked) : null),
    [screen, statuses, acked, personal],
  )

  useEffect(() => {
    if (!transitions) return
    const silent = transitions.silentAck.filter((id) => !sent.current.has(id))
    const announce = transitions.announce.filter((id) => !sent.current.has(id))
    for (const id of [...silent, ...announce]) sent.current.add(id)
    if (silent.length > 0) guide.ackSilently(UNLOCKS_TOUR, silent)
    if (announce.length > 0) {
      setFresh((f) => [...f, ...announce])
      guide.ackSilently(UNLOCKS_TOUR, announce)
      for (const id of announce) trackEvent("feature_unlocked", { id })
    }
  }, [transitions, guide])

  const byId = new Map((statuses ?? []).map((s) => [s.id, s]))
  return {
    // Conta do casal, ou tela sem desbloqueio agora (outro mês): mostra tudo.
    // O que já foi liberado uma vez continua liberado (ver isUnlockedFor).
    isUnlocked: (id: string) => {
      if (!personal || !statuses) return true
      const s = byId.get(id)
      return !!s && isUnlockedFor(s, acked)
    },
    isNew: (id: string) => fresh.includes(id),
    locked: personal && statuses ? lockedStatuses(statuses, acked) : [],
    // O que falta para liberar, para o exemplo ("… · 1 de 3").
    hintOf: (id: string) => {
      const s = byId.get(id)
      if (!s) return undefined
      return s.progress ? `${s.hint} ${s.progress.current} de ${s.progress.target}.` : s.hint
    },
  }
}

// Seção que acabou de ser liberada: entra com um "abrir" curto e o selo.
export function Unlockable({ isNew, title, children }: { isNew: boolean; title: string; children: ReactNode }) {
  const reduceMotion = useReducedMotion()
  if (!isNew) return <>{children}</>
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: 0.15 }}
      className="relative"
    >
      <motion.p
        role="status"
        initial={reduceMotion ? false : { opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.45 }}
        className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-foreground/[0.04] px-2.5 py-1 text-xs font-medium text-foreground"
      >
        <motion.span
          aria-hidden
          initial={reduceMotion ? false : { rotate: -25, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.5 }}
          className="inline-flex"
        >
          <LockSimpleOpen size={13} weight="bold" />
        </motion.span>
        {unlockedTitle(title)}
        <Sparkle size={12} weight="fill" aria-hidden className="text-attention-ink" />
      </motion.p>
      {children}
    </motion.div>
  )
}
