"use client"

import { useEffect, useRef } from "react"
import { useAccount } from "@/components/account/account-context"
import { useGuide } from "@/components/guide/guide-provider"
import { Coachmark } from "@/components/guide/coachmark"
import { trackEvent } from "@/lib/events"
import { PLAN_TOUR, currentReplayStep, currentSimpleStep, isTourActive, tourState, type GuideStep } from "@/lib/guide"

interface TourGuideProps {
  tour: string
  steps: GuideStep[]
  // Passos de ação já feitos (vêm dos dados da tela).
  doneByData?: Record<string, boolean>
  // A tela está pronta para o roteiro (carregou, tem o que mostrar).
  enabled: boolean
}

// Roteiro curto de uma tela. Regras comuns: só na conta pessoal, depois do
// guiado do plano (ele vem primeiro), um roteiro por visita, e termina
// sozinho quando o último passo acaba.
export function TourGuide({ tour, steps, doneByData, enabled }: TourGuideProps) {
  const guide = useGuide()
  const { selection } = useAccount()
  const state = guide.state
  const ready = enabled && !!state && selection.type === "personal" && !isTourActive(state, PLAN_TOUR)
  // Revendo esta tela (Configurações → Dicas): todos os passos, só "Entendi".
  const replaying = guide.replay?.tour === tour
  const current = replaying
    ? enabled
      ? currentReplayStep(steps, guide.replay!.acked)
      : null
    : ready
      ? currentSimpleStep(steps, tourState(state, tour), doneByData)
      : null
  const allowed = !!current && guide.canShow(tour)
  const lastShown = useRef<string | null>(null)
  const active = !!state && isTourActive(state, tour)

  useEffect(() => {
    if (!current || !allowed || replaying) return
    guide.claim(tour)
    if (lastShown.current !== current.step.id) {
      lastShown.current = current.step.id
      trackEvent("guide_step_shown", { tour, step: current.step.id })
    }
  }, [current, allowed, guide, tour, replaying])

  // Todos os passos feitos: roteiro concluído (na revisão, só sai dela).
  useEffect(() => {
    if (replaying) {
      if (enabled && !current) guide.endReplay()
      return
    }
    if (ready && active && !current) guide.finish(tour)
  }, [replaying, enabled, ready, active, current, guide, tour])

  if (!current || !allowed) return null
  return (
    <Coachmark
      step={current.step}
      index={current.index}
      total={current.total}
      onPrimary={() => (replaying ? guide.ackReplay(current.step.id) : guide.ack(tour, current.step.id))}
      onSkipTour={() => (replaying ? guide.endReplay() : guide.skip(tour, current.step.id))}
    />
  )
}
