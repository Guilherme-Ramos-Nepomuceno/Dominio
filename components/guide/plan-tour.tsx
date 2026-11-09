"use client"

import { useEffect, useMemo, useRef } from "react"
import { useAccount } from "@/components/account/account-context"
import { useGuide } from "@/components/guide/guide-provider"
import { Coachmark } from "@/components/guide/coachmark"
import { trackEvent } from "@/lib/events"
import {
  PLAN_TOUR,
  currentPlanTourStep,
  currentReplayStep,
  planReplaySteps,
  groupDetailTourStep,
  isTourActive,
  planTourFacts,
  tourState,
} from "@/lib/guide"
import type { Plan } from "@/lib/plan"

// Só na conta pessoal e com o plano editável (mês atual ou futuro, não
// fechado): é onde dá para montar o plano.
function useCanGuide(editable: boolean): boolean {
  const { selection } = useAccount()
  return editable && selection.type === "personal"
}

// Guiado de montar o plano, na tela Planejar.
export function PlanTourGuide({ plan, editable }: { plan: Plan; editable: boolean }) {
  const guide = useGuide()
  const canGuide = useCanGuide(editable)
  const tour = tourState(guide.state, PLAN_TOUR)
  const facts = useMemo(() => planTourFacts(plan), [plan])
  const replaying = guide.replay?.tour === PLAN_TOUR
  const { selection } = useAccount()
  // Revendo (Configurações → Dicas): todos os passos, mesmo com o plano já
  // confirmado (aí sem o "Confirmar"), só com "Entendi".
  const current = replaying
    ? selection.type === "personal"
      ? currentReplayStep(planReplaySteps(facts), guide.replay!.acked)
      : null
    : guide.state && canGuide && guide.canShow(PLAN_TOUR)
      ? currentPlanTourStep(facts, tour)
      : null
  const active = !!guide.state && isTourActive(guide.state, PLAN_TOUR)
  const lastShown = useRef<string | null>(null)

  // Plano confirmado com o guiado em andamento: guiado concluído.
  useEffect(() => {
    if (active && (plan.status === "CONFIRMED" || plan.status === "CLOSED")) guide.finish(PLAN_TOUR)
  }, [active, plan.status, guide])

  useEffect(() => {
    if (replaying && !current) guide.endReplay()
  }, [replaying, current, guide])

  useEffect(() => {
    if (current && !replaying) guide.claim(PLAN_TOUR)
    if (current && lastShown.current !== current.step.id) {
      lastShown.current = current.step.id
      trackEvent("guide_step_shown", { tour: PLAN_TOUR, step: current.step.id })
    }
  }, [current, guide, replaying])

  if (!current) return null
  return (
    <Coachmark
      step={current.step}
      index={current.index}
      total={current.total}
      onPrimary={() => (replaying ? guide.ackReplay(current.step.id) : guide.ack(PLAN_TOUR, current.step.id))}
      onSkipTour={() => (replaying ? guide.endReplay() : guide.skip(PLAN_TOUR, current.step.id))}
    />
  )
}

// No detalhe de um grupo: onde digitar os valores e, depois, voltar ao plano.
export function GroupTourGuide({ plan, kind, editable }: { plan: Plan; kind: string; editable: boolean }) {
  const guide = useGuide()
  const canGuide = useCanGuide(editable)
  const facts = useMemo(() => planTourFacts(plan), [plan])
  // Revendo dicas: o detalhe do grupo fica quieto (a revisão é na tela Planejar).
  const current =
    guide.state && canGuide && !guide.replay && guide.canShow(PLAN_TOUR)
      ? groupDetailTourStep(facts, tourState(guide.state, PLAN_TOUR), kind)
      : null

  if (!current) return null
  return (
    <Coachmark
      step={current.step}
      index={current.index}
      total={current.total}
      onPrimary={() => guide.ack(PLAN_TOUR, current.step.id)}
      onSkipTour={() => guide.skip(PLAN_TOUR, current.step.id)}
    />
  )
}
