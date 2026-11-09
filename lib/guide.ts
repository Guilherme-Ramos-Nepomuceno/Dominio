// Guiado nas telas reais: um componente em destaque por vez, com um balão
// explicando e "Entendi" ou a própria ação para avançar. Lógica pura e
// roteiros — testável com node:test. O progresso (o que a pessoa marcou
// "Entendi", terminou ou pulou) fica na API (GET/PATCH /guide); o que dá para
// deduzir dos dados (definiu o orçamento, confirmou o plano) vem dos dados.

export interface GuideTourState {
  acked: string[]
  done: boolean
  skipped: boolean
}

export type GuideState = Record<string, GuideTourState>

export const EMPTY_TOUR: GuideTourState = { acked: [], done: false, skipped: false }

export function mapGuideState(raw: any): GuideState {
  const result: GuideState = {}
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return result
  for (const [tour, value] of Object.entries(raw as Record<string, any>)) {
    if (!value || typeof value !== "object") continue
    result[tour] = {
      acked: Array.isArray(value.acked) ? value.acked.filter((s: unknown): s is string => typeof s === "string") : [],
      done: value.done === true,
      skipped: value.skipped === true,
    }
  }
  return result
}

export function tourState(state: GuideState | null, tour: string): GuideTourState {
  return state?.[tour] ?? EMPTY_TOUR
}

export function isTourActive(state: GuideState | null, tour: string): boolean {
  const t = tourState(state, tour)
  return !t.done && !t.skipped
}

// ---------------------------------------------------------------------------
// Roteiro: montar o plano do mês (tela Planejar + detalhe de cada grupo)
// ---------------------------------------------------------------------------

export const PLAN_TOUR = "plan"

export type PlanGroupKind = "ESSENTIALS" | "LIFESTYLE" | "FUTURE"
export const PLAN_TOUR_GROUPS: PlanGroupKind[] = ["ESSENTIALS", "LIFESTYLE", "FUTURE"]

export type PlanTourStepId = "budget" | "group-ESSENTIALS" | "group-LIFESTYLE" | "group-FUTURE" | "margin" | "wish" | "confirm"

// Como o passo termina: "ack" = só com "Entendi"; "action" = fazendo a ação
// (o balão também oferece "Pular este passo").
export type GuideMode = "ack" | "action"

export interface GuideStep {
  id: string
  // data-guide do componente em destaque.
  target: string
  title: string
  body: string
  mode: GuideMode
  // Texto do botão principal (ack) ou do "pular" (action).
  cta: string
}

// O que o roteiro precisa saber do plano.
export interface PlanTourFacts {
  status: "NONE" | "DRAFT" | "CONFIRMED" | "CLOSED"
  // Planejado (comprometido + variável) de cada grupo.
  plannedByKind: Partial<Record<PlanGroupKind, number>>
  openWishes: number
  freeMargin: number
}

const GROUP_COPY: Record<PlanGroupKind, { title: string; body: string }> = {
  ESSENTIALS: {
    title: "Primeiro, o essencial",
    body: "Moradia, mercado, transporte, saúde e contas. Toque em Essenciais e diga quanto vai para cada um no mês.",
  },
  LIFESTYLE: {
    title: "Agora, o estilo de vida",
    body: "Restaurantes, lazer, assinaturas e compras. Toque em Estilo de vida e defina quanto aceita gastar com isso.",
  },
  FUTURE: {
    title: "E o seu futuro",
    body: "Quanto quer guardar ou investir por mês? Toque em Futuro e defina um valor, mesmo que pequeno.",
  },
}

export function planTourSteps(facts: Pick<PlanTourFacts, "freeMargin">): Array<GuideStep & { id: PlanTourStepId }> {
  return [
    {
      id: "budget",
      target: "plan-budget",
      title: "Quanto entra no mês?",
      body: "Seu plano começa pela renda do mês. Toque no lápis e ajuste o valor: é dele que saem todos os gastos.",
      mode: "action",
      cta: "O valor está certo",
    },
    ...PLAN_TOUR_GROUPS.map((kind) => ({
      id: `group-${kind}` as PlanTourStepId,
      target: `plan-group-${kind}`,
      title: GROUP_COPY[kind].title,
      body: GROUP_COPY[kind].body,
      mode: "action" as const,
      cta: "Pular este grupo",
    })),
    {
      id: "margin",
      target: "plan-headline",
      title: facts.freeMargin < 0 ? "O plano passou do orçamento" : "Isso é o que sobra",
      body:
        facts.freeMargin < 0
          ? "Os grupos somam mais do que entra. Reduza algum grupo até esse número ficar positivo."
          : "O que sobra depois dos grupos vai para os seus desejos do mês: aquilo que você quer comprar.",
      mode: "ack",
      cta: "Entendi",
    },
    {
      id: "wish",
      target: "plan-add-wish",
      title: "Tem algo que você quer comprar?",
      body: "Anote um desejo. O plano mostra se ele cabe na sobra deste mês ou quanto falta.",
      mode: "action",
      cta: "Agora não",
    },
    {
      id: "confirm",
      target: "plan-confirm",
      title: "Tudo certo? Confirme o plano",
      body: "Confirmado, o app calcula quanto você pode gastar a cada semana. Dá para ajustar o plano depois.",
      mode: "action",
      cta: "Depois",
    },
  ]
}

function stepDoneByData(id: PlanTourStepId, facts: PlanTourFacts): boolean {
  const confirmed = facts.status === "CONFIRMED" || facts.status === "CLOSED"
  switch (id) {
    // Salvar o orçamento cria o rascunho (sai de NONE).
    case "budget":
      return facts.status !== "NONE"
    case "group-ESSENTIALS":
    case "group-LIFESTYLE":
    case "group-FUTURE":
      return (facts.plannedByKind[id.slice("group-".length) as PlanGroupKind] ?? 0) > 0.004
    case "wish":
      return facts.openWishes > 0 || confirmed
    case "confirm":
      return confirmed
    case "margin":
      return false
  }
}

// Passo atual: o primeiro que não terminou (pelos dados ou pelo "Entendi").
// Plano já confirmado encerra o roteiro (null).
export function currentPlanTourStep(
  facts: PlanTourFacts,
  tour: GuideTourState,
): { step: GuideStep & { id: PlanTourStepId }; index: number; total: number } | null {
  if (tour.done || tour.skipped) return null
  if (facts.status === "CONFIRMED" || facts.status === "CLOSED") return null
  const steps = planTourSteps(facts)
  const acked = new Set(tour.acked)
  const index = steps.findIndex((s) => !acked.has(s.id) && !stepDoneByData(s.id, facts))
  if (index < 0) return null
  return { step: steps[index], index, total: steps.length }
}

// No detalhe de um grupo: se o roteiro está nesse grupo, o que mostrar.
// "input" = digitar o valor das categorias; "back" = voltar ao plano.
export function groupDetailTourStep(
  facts: PlanTourFacts,
  tour: GuideTourState,
  kind: string,
): { step: GuideStep; index: number; total: number } | null {
  if (tour.done || tour.skipped) return null
  if (facts.status === "CONFIRMED" || facts.status === "CLOSED") return null
  if (!PLAN_TOUR_GROUPS.includes(kind as PlanGroupKind)) return null
  const current = currentPlanTourStep(facts, tour)
  const groupStepId = `group-${kind}`
  const steps = planTourSteps(facts)
  const index = steps.findIndex((s) => s.id === groupStepId)
  const total = steps.length
  const acked = new Set(tour.acked)
  // Ainda sem valor neste grupo e é a vez dele: mostra onde digitar (até o
  // "Entendi" — depois deixa a pessoa preencher em paz).
  if (current?.step.id === groupStepId) {
    if (acked.has(`${groupStepId}-input`)) return null
    return {
      index,
      total,
      step: {
        id: `${groupStepId}-input`,
        target: "group-first-input",
        title: "Digite quanto vai para cada categoria",
        body: "É o valor do mês, para o que varia (mercado, lazer...). A sobra lá embaixo muda na hora. Deixe em 0 o que não usa.",
        mode: "action",
        cta: "Entendi",
      },
    }
  }
  // Já tem valor e este era o grupo da vez: chama de volta ao plano.
  const planned = facts.plannedByKind[kind as PlanGroupKind] ?? 0
  if (planned > 0.004 && !acked.has(`${groupStepId}-back`) && current && current.index === index + 1) {
    return {
      index,
      total,
      step: {
        id: `${groupStepId}-back`,
        target: "group-back",
        title: "Pronto! Volte ao plano",
        body: "Esse grupo está definido. Volte para o plano e siga para o próximo passo.",
        mode: "action",
        cta: "Entendi",
      },
    }
  }
  return null
}

// Fatos do roteiro a partir do plano (lib/plan.ts).
export function planTourFacts(plan: {
  status: PlanTourFacts["status"]
  groups: Array<{ kind: string; planned: number }>
  wishes: Array<{ status: string }>
  freeMargin: number
}): PlanTourFacts {
  const plannedByKind: PlanTourFacts["plannedByKind"] = {}
  for (const g of plan.groups) {
    if (PLAN_TOUR_GROUPS.includes(g.kind as PlanGroupKind)) plannedByKind[g.kind as PlanGroupKind] = g.planned
  }
  return {
    status: plan.status,
    plannedByKind,
    openWishes: plan.wishes.filter((w) => w.status === "OPEN").length,
    freeMargin: plan.freeMargin,
  }
}

// Posição do balão: abaixo do alvo se couber, senão acima. Horizontalmente,
// centralizado no alvo e preso às bordas da tela (16px).
export function tooltipPosition(params: {
  target: { top: number; left: number; width: number; height: number }
  tooltip: { width: number; height: number }
  viewport: { width: number; height: number }
  gap?: number
  margin?: number
}): { top: number; left: number; placement: "below" | "above"; arrowLeft: number } {
  const gap = params.gap ?? 14
  const margin = params.margin ?? 16
  const { target, tooltip, viewport } = params
  const below = target.top + target.height + gap
  const fitsBelow = below + tooltip.height <= viewport.height - margin
  const above = target.top - gap - tooltip.height
  const placement = fitsBelow || above < margin ? "below" : "above"
  const top = placement === "below" ? below : above
  const centerX = target.left + target.width / 2
  const maxLeft = Math.max(margin, viewport.width - margin - tooltip.width)
  const left = Math.min(Math.max(centerX - tooltip.width / 2, margin), maxLeft)
  const arrowLeft = Math.min(Math.max(centerX - left, 20), tooltip.width - 20)
  return { top, left, placement, arrowLeft }
}

// Convite na Home para montar o plano: conta pessoal, plano do mês ainda não
// começado (NONE) e o guiado do plano nem terminado nem pulado.
export function showsPlanInvite(params: { isPersonal: boolean; planStatus: string | null; tourActive: boolean }): boolean {
  return params.isPersonal && params.planStatus === "NONE" && params.tourActive
}

// ---------------------------------------------------------------------------
// Roteiros curtos das outras telas (Minha semana, Home, Caixa de entrada)
// ---------------------------------------------------------------------------

export const WEEK_TOUR = "week"
export const HOME_TOUR = "home"
export const INBOX_TOUR = "inbox"

// Passo atual de um roteiro simples: o primeiro que não terminou pelos dados
// nem pelo "Entendi". `doneByData` só para passos de ação.
export function currentSimpleStep(
  steps: GuideStep[],
  tour: GuideTourState,
  doneByData: Record<string, boolean> = {},
): { step: GuideStep; index: number; total: number } | null {
  if (tour.done || tour.skipped) return null
  const acked = new Set(tour.acked)
  const index = steps.findIndex((s) => !acked.has(s.id) && !doneByData[s.id])
  if (index < 0) return null
  return { step: steps[index], index, total: steps.length }
}

// Roteiro da semana. O passo dos avisos só entra quando dá para ativar
// (push disponível e ainda não ativado neste aparelho).
export function weekTourSteps(params: { offerNotify: boolean }): GuideStep[] {
  const steps: GuideStep[] = [
    {
      id: "available",
      target: "week-available",
      title: "Quanto ainda dá para gastar",
      body: "Este é o número da semana: o que sobra do limite até o fim dela. Ele muda a cada gasto que você registra.",
      mode: "ack",
      cta: "Entendi",
    },
    {
      id: "days",
      target: "week-days",
      title: "Um valor por dia",
      body: "Dividimos o que sobra pelos dias que faltam. Gastou mais num dia? Os próximos ficam um pouco menores, sem precisar fazer conta.",
      mode: "ack",
      cta: "Entendi",
    },
  ]
  if (params.offerNotify) {
    steps.push({
      id: "notify",
      target: "week-notify",
      title: "Quer um lembrete por semana?",
      body: "No começo da semana avisamos quanto você pode gastar. No máximo 3 avisos por semana, e dá para desligar quando quiser.",
      mode: "action",
      cta: "Agora não",
    })
  }
  return steps
}

export const HOME_TOUR_STEPS: GuideStep[] = [
  {
    id: "today",
    target: "home-today",
    title: "Seu número do dia",
    body: "Quanto dá para gastar hoje sem sair do plano da semana. Toque para ver a semana inteira.",
    mode: "ack",
    cta: "Entendi",
  },
  {
    id: "add",
    target: "quick-add",
    title: "Registre em segundos",
    body: "Gastou? Toque aqui, digite o valor e pronto. A categoria pode ficar para depois.",
    mode: "action",
    cta: "Depois",
  },
]

export const INBOX_TOUR_STEPS: GuideStep[] = [
  {
    id: "accept",
    target: "inbox-accept",
    title: "Um toque classifica o grupo",
    body: "Juntamos os lançamentos parecidos. Aceite a sugestão e todos vão para a categoria de uma vez; o app aprende com isso.",
    mode: "ack",
    cta: "Entendi",
  },
]

// Um roteiro por visita: o primeiro que aparecer "reserva" a sessão; os
// outros esperam a próxima vez que o app abrir.
export function canShowTour(claimed: string | null, tour: string): boolean {
  return claimed === null || claimed === tour
}

// ---------------------------------------------------------------------------
// Rever as dicas de uma tela (Configurações → Dicas)
// ---------------------------------------------------------------------------

export interface GuideScreen {
  tour: string
  title: string
  description: string
  href: string
}

// Telas com dicas, na ordem em que a pessoa costuma conhecê-las.
export const GUIDE_SCREENS: GuideScreen[] = [
  { tour: PLAN_TOUR, title: "Planejar", description: "Como montar o plano do mês", href: "/plan" },
  { tour: HOME_TOUR, title: "Home", description: "O número do dia e o registro rápido", href: "/" },
  { tour: WEEK_TOUR, title: "Minha semana", description: "Limite da semana e valor por dia", href: "/week" },
  { tour: INBOX_TOUR, title: "Caixa de entrada", description: "Classificar com um toque", href: "/inbox" },
]

// Revendo: todo passo vira explicação com "Entendi" (os de ação também — a
// pessoa só quer rever, não precisa refazer), e nada vem dos dados.
export function replaySteps(steps: GuideStep[]): GuideStep[] {
  return steps.map((s, i) => ({ ...s, mode: "ack", cta: i === steps.length - 1 ? "Concluir" : "Entendi" }))
}

export function currentReplayStep(
  steps: GuideStep[],
  acked: string[],
): { step: GuideStep; index: number; total: number } | null {
  const replay = replaySteps(steps)
  const index = replay.findIndex((s) => !acked.includes(s.id))
  if (index < 0) return null
  return { step: replay[index], index, total: replay.length }
}

// No plano já confirmado, "Confirmar" não existe mais na tela: sai da revisão.
export function planReplaySteps(facts: Pick<PlanTourFacts, "status" | "freeMargin">): GuideStep[] {
  const confirmed = facts.status === "CONFIRMED" || facts.status === "CLOSED"
  return planTourSteps(facts).filter((s) => !(confirmed && s.id === "confirm"))
}
