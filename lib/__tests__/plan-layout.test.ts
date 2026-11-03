import { test } from "node:test"
import assert from "node:assert/strict"
import { mapPlan, withBudget } from "../plan.ts"
import {
  budgetCaption,
  canConfirmPlan,
  formatMoneyWhole,
  formatShortfall,
  groupColor,
  monthBar,
  monthBarSpentCaption,
  monthBarSummary,
  planGuide,
  planHeadline,
  planMonthTitle,
  planPeriodLabel,
  showsSpending,
  spentProgress,
  wishFitLabel,
  wishQueue,
} from "../plan-layout.ts"

// Intl usa espaço não separável entre "R$" e o número.
const NBSP = String.fromCharCode(160)
const brl = (s: string) => s.replace(/R\$ /g, `R$${NBSP}`)

const group = (id: string, name: string, kind: string, order: number, planned: number, spent = 0) => ({
  id,
  name,
  kind,
  order,
  countsInWeeklyLimit: kind !== "WISHES",
  committed: 0,
  plannedVariable: planned,
  planned,
  spent,
  // Uma categoria com todo o planejado (o recálculo otimista soma pelas categorias).
  categories:
    kind === "WISHES"
      ? []
      : [
          {
            categoryId: `${id}-cat`,
            name,
            color: "#999",
            committed: 0,
            committedItems: [],
            plannedVariable: planned,
            originalPlannedVariable: null,
            spent,
            spentVariable: spent,
            average3m: planned,
          },
        ],
})

const wish = (id: string, priority: number, estimatedAmount: number, fits: boolean, missing = 0, status = "OPEN") => ({
  id,
  userId: "u",
  year: 2026,
  month: 11,
  name: id,
  estimatedAmount,
  actualAmount: null,
  categoryId: null,
  priority,
  status,
  postponedCount: 0,
  link: null,
  notes: null,
  transactionId: null,
  goalId: null,
  fits,
  missing,
})

// Mesmo formato (e números) do plano real de novembro do usuário de teste.
const rawPlan = {
  year: 2026,
  month: 11,
  periodStart: "2026-11-01",
  periodEnd: "2026-11-30",
  status: "CONFIRMED",
  budgetAmount: null,
  budgetSource: "INCOME",
  suggestedBudget: 6000,
  weeklyLimitEnabled: true,
  groups: [
    group("ess", "Essenciais", "ESSENTIALS", 0, 2900),
    group("life", "Estilo de vida", "LIFESTYLE", 1, 550, 173.9),
    group("wish", "Desejos", "WISHES", 2, 750),
    group("fut", "Futuro", "FUTURE", 3, 600),
  ],
  uncategorized: { spent: 22 },
  freeMargin: 1928,
  wishes: [wish("jantar", 0, 300, true), wish("fone", 1, 450, true), wish("tenis", 2, 5000, false, 3822)],
  wishesPlanned: 750,
  leftover: 1178,
}

test("dinheiro sem centavos e falta arredondada para cima", () => {
  assert.equal(formatMoneyWhole(6000), brl("R$ 6.000"))
  assert.equal(formatMoneyWhole(173.9), brl("R$ 174"))
  assert.equal(formatMoneyWhole(-0.3), brl("R$ 0"))
  assert.equal(formatMoneyWhole(-500), brl("-R$ 500"))
  assert.equal(formatShortfall(-500.2), brl("R$ 501"))
  assert.equal(formatShortfall(0.3), brl("R$ 1"))
  assert.equal(formatShortfall(3822), brl("R$ 3.822"))
})

test("cada grupo tem uma cor fixa pelo kind", () => {
  assert.equal(groupColor("ESSENTIALS"), "var(--plan-essentials)")
  assert.equal(groupColor("LIFESTYLE"), "var(--plan-lifestyle)")
  assert.equal(groupColor("FUTURE"), "var(--plan-future)")
  assert.equal(groupColor("WISHES"), "var(--plan-wishes)")
  assert.equal(groupColor("OUTRO"), "var(--plan-uncategorized)")
})

test("barra do mês: grupos, sem categoria, desejos e livre somam o orçamento", () => {
  const bar = monthBar(mapPlan(rawPlan))
  assert.deepEqual(
    bar.segments.map((s) => [s.key, s.amount]),
    [
      ["ess", 2900],
      ["life", 550],
      ["fut", 600],
      ["uncategorized", 22],
      ["wish", 750],
      ["free", 1178],
    ],
  )
  assert.equal(bar.budget, 6000)
  assert.equal(bar.allocated, 4822)
  assert.equal(bar.free, 1178)
  assert.equal(bar.over, 0)
  assert.equal(bar.budgetPct, 100)
  const total = bar.segments.reduce((s, x) => s + x.widthPct, 0)
  assert.ok(Math.abs(total - 100) < 1e-9)
  // Desejos + Livre = a sobra para os desejos (margem livre).
  const tail = bar.segments.filter((s) => s.kind === "WISHES" || s.type === "free").reduce((s, x) => s + x.amount, 0)
  assert.equal(tail, 1928)
  const life = bar.segments.find((s) => s.key === "life")!
  assert.equal(Math.round(life.spentPct), 32)
  assert.equal(life.color, "var(--plan-lifestyle)")
  assert.equal(bar.segments.find((s) => s.type === "free")!.color, null)
  assert.equal(bar.segments[1].startPct, bar.segments[0].widthPct)
})

test("barra do mês: plano acima do orçamento mostra o excesso", () => {
  const plan = withBudget(mapPlan(rawPlan), 3500, "MANUAL")
  const bar = monthBar(plan)
  // 2900 + 550 + 600 + 22 = 4072 → passa 572; nenhum desejo cabe.
  assert.equal(bar.allocated, 4072)
  assert.equal(bar.over, 572)
  assert.equal(bar.free, 0)
  assert.equal(bar.scale, 4072)
  assert.ok(Math.abs(bar.budgetPct - (3500 / 4072) * 100) < 1e-9)
  assert.equal(bar.segments.some((s) => s.type === "free"), false)
  assert.equal(bar.segments.some((s) => s.kind === "WISHES"), false)
  assert.ok(monthBarSummary(bar).includes(brl("passa R$ 572 do orçamento")))
})

test("barra do mês: legenda do gasto soma os grupos e o sem categoria", () => {
  // 173,9 (Estilo de vida) + 22 (sem categoria) = 195,9 → R$ 196 de R$ 4.822.
  assert.equal(monthBarSpentCaption(monthBar(mapPlan(rawPlan))), brl("R$ 196 já gasto de R$ 4.822 planejado"))
})

test("barra do mês: sem orçamento nem plano fica vazia", () => {
  const bar = monthBar({ groups: [], uncategorized: { spent: 0 }, wishesPlanned: 0, budgetAmount: null, suggestedBudget: 0 })
  assert.deepEqual(bar.segments, [])
  assert.equal(bar.scale, 0)
  assert.match(monthBarSummary(bar), /ainda sem nada planejado/)
})

test("resumo em texto da barra", () => {
  const summary = monthBarSummary(monthBar(mapPlan(rawPlan)))
  assert.equal(
    summary,
    brl(
      "Orçamento de R$ 6.000: Essenciais R$ 2.900, Estilo de vida R$ 550, Futuro R$ 600, Sem categoria R$ 22, Desejos R$ 750, Livre R$ 1.178.",
    ),
  )
})

test("gasto real na barra só com plano confirmado e período começado", () => {
  assert.equal(showsSpending("CONFIRMED", "2026-11-01", "2026-11-02"), true)
  assert.equal(showsSpending("CLOSED", "2026-10-01", "2026-11-02"), true)
  assert.equal(showsSpending("CONFIRMED", "2026-12-01", "2026-11-02"), false)
  assert.equal(showsSpending("DRAFT", "2026-11-01", "2026-11-02"), false)
  assert.equal(showsSpending("NONE", "2026-11-01", "2026-11-02"), false)
})

test("barrinha gasto/planejado", () => {
  assert.deepEqual(spentProgress(50, 200), { pct: 25, over: false, overAmount: 0 })
  assert.deepEqual(spentProgress(250, 200), { pct: 100, over: true, overAmount: 50 })
  assert.deepEqual(spentProgress(10, 0), { pct: 100, over: true, overAmount: 10 })
  assert.deepEqual(spentProgress(0, 0), { pct: 0, over: false, overAmount: 0 })
})

test("fila dos desejos: comprados primeiro, depois os que cabem na ordem", () => {
  const plan = mapPlan({
    ...rawPlan,
    wishes: [...rawPlan.wishes, { ...wish("livro", 5, 80, true, 0, "BOUGHT"), actualAmount: 70 }],
  })
  const queue = wishQueue(plan)
  assert.deepEqual(
    queue.slices.map((s) => [s.id, s.amount, s.bought]),
    [
      ["livro", 70, true],
      ["jantar", 300, false],
      ["fone", 450, false],
    ],
  )
  assert.equal(queue.available, 1928)
  assert.equal(queue.used, 820)
  assert.equal(queue.fittingCount, 2)
  assert.equal(queue.openCount, 3)
  assert.ok(Math.abs(queue.slices[1].startPct - (70 / 1928) * 100) < 1e-9)
  // Sem margem: nada enche a barra.
  const empty = wishQueue({ freeMargin: -100, wishes: [] })
  assert.deepEqual(empty.slices, [])
})

test("rótulo de cada desejo: cabe, agora cabe ou quanto falta", () => {
  assert.deepEqual(wishFitLabel({ fits: true, missing: 0, estimatedAmount: 300 }), { tone: "fits", text: "cabe" })
  assert.deepEqual(wishFitLabel({ fits: true, missing: 0, estimatedAmount: 300 }, true), { tone: "fresh", text: "Agora cabe!" })
  assert.deepEqual(wishFitLabel({ fits: false, missing: 3822, estimatedAmount: 5000 }), {
    tone: "missing",
    text: brl("faltam R$ 3.822"),
  })
  assert.equal(wishFitLabel({ fits: false, missing: 0, estimatedAmount: 90 }).text, brl("faltam R$ 90"))
})

test("herói: sobra para desejos no rascunho, sobra prevista confirmado", () => {
  const plan = mapPlan(rawPlan)
  assert.deepEqual(planHeadline({ ...plan, status: "DRAFT" }), {
    label: "Sobra para seus desejos",
    value: 1928,
    negative: false,
    shortfallText: null,
  })
  assert.equal(planHeadline(plan).label, "Sobra prevista")
  assert.equal(planHeadline(plan).value, 1178)
  const negative = planHeadline({ status: "NONE", freeMargin: -572, leftover: -572 })
  assert.equal(negative.negative, true)
  assert.equal(negative.shortfallText, brl("Faltam R$ 572 para fechar o plano"))
})

test("legenda do orçamento", () => {
  const plan = mapPlan(rawPlan)
  assert.equal(budgetCaption(plan), brl("de R$ 6.000 de renda prevista"))
  assert.equal(budgetCaption({ ...plan, budgetAmount: 5000, budgetSource: "MANUAL" }), brl("de R$ 5.000 de orçamento"))
  assert.equal(budgetCaption({ ...plan, suggestedBudget: 0 }), "Sem renda prevista — defina o orçamento do mês")
})

test("cabeçalho: mês e período do plano", () => {
  assert.equal(planMonthTitle(2026, 11, 2026), "Novembro")
  assert.equal(planMonthTitle(2027, 1, 2026), "Janeiro de 2027")
  assert.equal(planPeriodLabel("2026-11-01", "2026-11-30"), "1 a 30 nov")
  assert.equal(planPeriodLabel("2026-11-05", "2026-12-04"), "5 nov a 4 dez")
  assert.equal(planPeriodLabel("2026-12-05T00:00:00.000Z", "2027-01-04"), "5 dez a 4 jan")
  assert.equal(planPeriodLabel("", ""), "")
})

test("guia do topo e botão de confirmar", () => {
  assert.equal(planGuide("DRAFT"), "Confira o orçamento, ajuste os grupos e escolha os desejos.")
  assert.match(planGuide("NONE")!, /Proposta/)
  assert.match(planGuide("CLOSED")!, /só para consulta/)
  assert.equal(planGuide("CONFIRMED"), null)
  assert.equal(canConfirmPlan("NONE", true), true)
  assert.equal(canConfirmPlan("DRAFT", true), true)
  assert.equal(canConfirmPlan("DRAFT", false), false)
  assert.equal(canConfirmPlan("CONFIRMED", true), false)
})
