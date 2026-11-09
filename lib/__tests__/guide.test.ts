import { test } from "node:test"
import assert from "node:assert/strict"
import {
  EMPTY_TOUR,
  currentPlanTourStep,
  groupDetailTourStep,
  isTourActive,
  mapGuideState,
  planTourFacts,
  showsPlanInvite,
  weekTourSteps,
  currentSimpleStep,
  HOME_TOUR_STEPS,
  canShowTour,
  currentReplayStep,
  planReplaySteps,
  GUIDE_SCREENS,
  tooltipPosition,
  type PlanTourFacts,
} from "../guide.ts"

const fresh: PlanTourFacts = { status: "NONE", plannedByKind: {}, openWishes: 0, freeMargin: 5000 }

test("mapGuideState: tolera lixo e lê os roteiros", () => {
  assert.deepEqual(mapGuideState(null), {})
  assert.deepEqual(mapGuideState({ plan: { acked: ["budget", 1], done: false, skipped: true } }), {
    plan: { acked: ["budget"], done: false, skipped: true },
  })
  assert.equal(isTourActive({}, "plan"), true)
  assert.equal(isTourActive({ plan: { acked: [], done: true, skipped: false } }, "plan"), false)
})

test("roteiro do plano avança pelos dados: orçamento, grupos, sobra, desejo, confirmar", () => {
  const step = (facts: PlanTourFacts, acked: string[] = []) => currentPlanTourStep(facts, { ...EMPTY_TOUR, acked })?.step.id ?? null
  assert.equal(step(fresh), "budget")
  const draft = { ...fresh, status: "DRAFT" as const }
  assert.equal(step(draft), "group-ESSENTIALS")
  assert.equal(step({ ...draft, plannedByKind: { ESSENTIALS: 2000 } }), "group-LIFESTYLE")
  const groupsDone = { ...draft, plannedByKind: { ESSENTIALS: 2000, LIFESTYLE: 800, FUTURE: 300 } }
  assert.equal(step(groupsDone), "margin")
  assert.equal(step(groupsDone, ["margin"]), "wish")
  assert.equal(step({ ...groupsDone, openWishes: 1 }, ["margin"]), "confirm")
  assert.equal(step({ ...groupsDone, status: "CONFIRMED" }), null)
})

test("pular um passo de ação conta como Entendi; pulado ou terminado não mostra nada", () => {
  const draft = { ...fresh, status: "DRAFT" as const }
  assert.equal(currentPlanTourStep(draft, { ...EMPTY_TOUR, acked: ["group-ESSENTIALS"] })?.step.id, "group-LIFESTYLE")
  assert.equal(currentPlanTourStep(fresh, { acked: [], done: false, skipped: true }), null)
  assert.equal(currentPlanTourStep(fresh, { acked: [], done: true, skipped: false }), null)
})

test("sobra negativa muda o texto do passo da sobra", () => {
  const facts = { ...fresh, status: "DRAFT" as const, freeMargin: -200, plannedByKind: { ESSENTIALS: 1, LIFESTYLE: 1, FUTURE: 1 } }
  assert.match(currentPlanTourStep(facts, EMPTY_TOUR)!.step.title, /passou/)
})

test("detalhe do grupo: digitar enquanto é a vez dele; depois, voltar ao plano", () => {
  const draft = { ...fresh, status: "DRAFT" as const }
  assert.equal(groupDetailTourStep(draft, EMPTY_TOUR, "ESSENTIALS")?.step.target, "group-first-input")
  // Depois do "Entendi", o balão de digitar sai.
  assert.equal(groupDetailTourStep(draft, { ...EMPTY_TOUR, acked: ["group-ESSENTIALS-input"] }, "ESSENTIALS"), null)
  // Outro grupo, que ainda não é a vez: nada.
  assert.equal(groupDetailTourStep(draft, EMPTY_TOUR, "LIFESTYLE"), null)
  const filled = { ...draft, plannedByKind: { ESSENTIALS: 1500 } }
  assert.equal(groupDetailTourStep(filled, EMPTY_TOUR, "ESSENTIALS")?.step.target, "group-back")
  assert.equal(groupDetailTourStep(filled, { ...EMPTY_TOUR, acked: ["group-ESSENTIALS-back"] }, "ESSENTIALS"), null)
  assert.equal(groupDetailTourStep(draft, EMPTY_TOUR, "WISHES"), null)
})

test("planTourFacts lê grupos e desejos do plano", () => {
  const facts = planTourFacts({
    status: "DRAFT",
    groups: [
      { kind: "ESSENTIALS", planned: 1000 },
      { kind: "WISHES", planned: 200 },
    ],
    wishes: [{ status: "OPEN" }, { status: "BOUGHT" }],
    freeMargin: 300,
  })
  assert.deepEqual(facts, { status: "DRAFT", plannedByKind: { ESSENTIALS: 1000 }, openWishes: 1, freeMargin: 300 })
})

test("tooltipPosition: abaixo quando cabe, acima perto do rodapé, preso às bordas", () => {
  const viewport = { width: 390, height: 844 }
  const tooltip = { width: 320, height: 150 }
  const below = tooltipPosition({ target: { top: 100, left: 20, width: 100, height: 40 }, tooltip, viewport })
  assert.equal(below.placement, "below")
  assert.equal(below.top, 154)
  assert.equal(below.left, 16)
  const above = tooltipPosition({ target: { top: 740, left: 20, width: 350, height: 56 }, tooltip, viewport })
  assert.equal(above.placement, "above")
  assert.equal(above.top, 740 - 14 - 150)
  assert.ok(above.left + tooltip.width <= viewport.width - 16)
})

test("convite na Home: só conta pessoal, plano não começado e guiado ativo", () => {
  assert.equal(showsPlanInvite({ isPersonal: true, planStatus: "NONE", tourActive: true }), true)
  assert.equal(showsPlanInvite({ isPersonal: true, planStatus: "DRAFT", tourActive: true }), false)
  assert.equal(showsPlanInvite({ isPersonal: true, planStatus: "NONE", tourActive: false }), false)
  assert.equal(showsPlanInvite({ isPersonal: false, planStatus: "NONE", tourActive: true }), false)
})

test("roteiros curtos: semana sem avisos tem 2 passos; com avisos, 3", () => {
  assert.equal(weekTourSteps({ offerNotify: false }).length, 2)
  const steps = weekTourSteps({ offerNotify: true })
  assert.deepEqual(steps.map((s) => s.id), ["available", "days", "notify"])
  assert.equal(currentSimpleStep(steps, EMPTY_TOUR)?.step.id, "available")
  assert.equal(currentSimpleStep(steps, { ...EMPTY_TOUR, acked: ["available", "days"] })?.step.id, "notify")
  assert.equal(currentSimpleStep(steps, { ...EMPTY_TOUR, acked: ["available", "days"] }, { notify: true }), null)
})

test("home: o passo do + termina com o primeiro registro", () => {
  assert.equal(currentSimpleStep(HOME_TOUR_STEPS, { ...EMPTY_TOUR, acked: ["today"] })?.step.id, "add")
  assert.equal(currentSimpleStep(HOME_TOUR_STEPS, { ...EMPTY_TOUR, acked: ["today"] }, { add: true }), null)
})

test("um roteiro por visita", () => {
  assert.equal(canShowTour(null, "week"), true)
  assert.equal(canShowTour("week", "week"), true)
  assert.equal(canShowTour("plan", "week"), false)
})

test("rever dicas: todo passo vira Entendi, o último Concluir, nada vem dos dados", () => {
  const first = currentReplayStep(HOME_TOUR_STEPS, [])!
  assert.equal(first.step.mode, "ack")
  assert.equal(first.step.cta, "Entendi")
  const last = currentReplayStep(HOME_TOUR_STEPS, ["today"])!
  assert.equal(last.step.id, "add")
  assert.equal(last.step.mode, "ack")
  assert.equal(last.step.cta, "Concluir")
  assert.equal(currentReplayStep(HOME_TOUR_STEPS, ["today", "add"]), null)
})

test("rever o plano confirmado não aponta para o Confirmar", () => {
  const ids = (status: "DRAFT" | "CONFIRMED") => planReplaySteps({ status, freeMargin: 100 }).map((s) => s.id)
  assert.ok(ids("DRAFT").includes("confirm"))
  assert.ok(!ids("CONFIRMED").includes("confirm"))
  assert.deepEqual(GUIDE_SCREENS.map((s) => s.href), ["/plan", "/", "/week", "/inbox"])
})
