import { test } from "node:test"
import assert from "node:assert/strict"
import {
  mapWins,
  winsEncouragement,
  dayDots,
  dayDotsSummary,
  recoveryMessage,
  weekClosedCelebration,
  wishProgressMessage,
  groupStatusLabel,
  vsLastMonthHint,
  previousMonthName,
  wishesRealizedLabel,
  confirmSummary,
  confirmSummaryLines,
} from "../wins.ts"
import { heroBarTone, lastWeekLabel, mapWeek, weekPills } from "../week.ts"
import { fabVisibleAfterScroll } from "../scroll.ts"

const brl = (v: number) => `R$ ${v.toFixed(2)}`
// Intl usa espaço não separável entre "R$" e o número.
const norm = (s: string | null) => (s ?? "").replace(/ /g, " ")

test("mapWins: tolera campos ausentes, descarta tipos desconhecidos e corta em 3", () => {
  const raw = {
    week: {
      dayStatus: [{ date: "2026-11-01", status: "OVER" }, { date: "2026-11-02", status: "???" }],
      wins: [
        { id: "a", kind: "INBOX_ZERO", title: "Caixa", priority: 50 },
        { id: "b", kind: "NOPE", title: "x", priority: 1 },
        { id: "c", kind: "DAYS_UNDER", title: "2 de 3", priority: 20, value: "2" },
        { id: "d", kind: "LOGGING_STREAK", title: "Reg", priority: 40 },
        { id: "e", kind: "WEEK_UNDER", title: "Sem", priority: 14 },
      ],
      recovery: { perDayToRecover: 0, untilDate: "2026-11-07" },
      weekClosed: { closedUnder: true, leftover: "120.5" },
    },
  }
  const wins = mapWins(raw)
  assert.deepEqual(wins.week.dayStatus.map((d) => d.status), ["OVER", "FUTURE"])
  assert.deepEqual(wins.week.wins.map((w) => w.id), ["e", "c", "d"])
  assert.equal(wins.week.wins[1].value, 2)
  assert.equal(wins.week.recovery, null) // 0 por dia não é recuperação
  assert.deepEqual(wins.week.weekClosed, { closedUnder: true, leftover: 120.5 })
  assert.deepEqual(wins.month.wins, [])
  assert.equal(wins.month.wishesBoughtThisYear, 0)
  assert.deepEqual(mapWins(null).week.wins, [])
})

test("winsEncouragement: neutro, nunca uma vitória inventada", () => {
  assert.equal(winsEncouragement("week", true).title, "Registre seus gastos de hoje")
  assert.equal(winsEncouragement("month", false).title, "Monte o plano do mês")
  assert.equal(winsEncouragement("month", true).href, "/week")
})

test("dayDots: letra do dia, hoje destacado e rótulo acessível", () => {
  const dots = dayDots(
    [
      { date: "2026-11-01", status: "OVER" },
      { date: "2026-11-02", status: "NO_SPEND" },
      { date: "2026-11-03", status: "FUTURE" },
    ],
    "2026-11-02",
  )
  assert.deepEqual(dots.map((d) => d.letter), ["D", "S", "T"])
  assert.deepEqual(dots.map((d) => d.isToday), [false, true, false])
  assert.equal(dots[0].label, "domingo: acima do ideal")
  assert.equal(dots[1].label, "segunda (hoje): sem gasto até agora")
  assert.equal(dayDotsSummary(dots), "Dias da semana até hoje: 1 sem gasto, 1 acima do ideal.")
  assert.equal(dayDotsSummary([]), "Nenhum dia da semana passou ainda.")
})

test("recoveryMessage: arredonda o valor por dia para baixo e cita o dia da semana", () => {
  assert.equal(
    norm(recoveryMessage({ perDayToRecover: 23.74, untilDate: "2026-11-07" })),
    "Gastando até R$ 23 por dia até sábado, você fecha a semana dentro do limite.",
  )
  assert.equal(recoveryMessage(null), null)
})

test("weekClosedCelebration: só quando fechou dentro", () => {
  assert.equal(norm(weekClosedCelebration({ closedUnder: true, leftover: 120.4 })?.detail ?? null), "Sobrou R$ 120 do limite.")
  assert.equal(weekClosedCelebration({ closedUnder: false, leftover: 0 }), null)
  assert.equal(weekClosedCelebration(null), null)
})

test("wishProgressMessage: com e sem categoria de origem", () => {
  assert.equal(
    wishProgressMessage({ name: "Tênis", pct: 40, sourceCategoryName: "Delivery" }),
    "O que você deixou de gastar em Delivery já paga 40% de Tênis",
  )
  assert.equal(wishProgressMessage({ name: "Fone", pct: 100, sourceCategoryName: null }), "O que você deixou de gastar este mês já paga Fone inteiro")
})

test("groupStatusLabel e vsLastMonthHint", () => {
  assert.equal(norm(groupStatusLabel({ status: "UNDER", remaining: 2900 })?.text ?? null), "dentro do plano, R$ 2.900 disponível")
  assert.equal(groupStatusLabel({ status: "ON_TRACK", remaining: 10 })?.tone, "neutral")
  assert.equal(groupStatusLabel({ status: "OVER", remaining: -5 })?.text, "acima do plano")
  assert.equal(groupStatusLabel(undefined), null)
  assert.equal(previousMonthName(11), "outubro")
  assert.equal(previousMonthName(1), "dezembro")
  assert.equal(norm(vsLastMonthHint(-150, 11)), "R$ 150 a menos que em outubro")
  assert.equal(norm(vsLastMonthHint(80, 1)), "R$ 80 a mais que em dezembro")
  assert.equal(vsLastMonthHint(5, 11), null)
  assert.equal(vsLastMonthHint(undefined, 11), null)
})

test("wishesRealizedLabel", () => {
  assert.equal(wishesRealizedLabel(0), null)
  assert.equal(wishesRealizedLabel(1), "1 desejo realizado este ano")
  assert.equal(wishesRealizedLabel(3), "3 desejos realizados este ano")
})

test("confirmSummary: essencial, desejos que cabem e o livre", () => {
  const plan: any = {
    groups: [
      { kind: "ESSENTIALS", planned: 3200 },
      { kind: "LIFESTYLE", planned: 900 },
    ],
    wishes: [
      { status: "OPEN", fits: true },
      { status: "OPEN", fits: false },
      { status: "BOUGHT", fits: true },
    ],
    leftover: 450.6,
  }
  const summary = confirmSummary(plan)
  assert.deepEqual(summary, { essentials: 3200, fittingWishes: 1, free: 450.6 })
  assert.deepEqual(confirmSummaryLines(summary).map(norm), ["R$ 3.200 garantidos para o essencial", "1 desejo cabe no mês", "R$ 451 livres"])
  assert.deepEqual(confirmSummaryLines({ essentials: 0, fittingWishes: 0, free: 0 }), [])
})

test("heroBarTone: barra conta a mesma história do selo", () => {
  assert.equal(heroBarTone("UNDER", 100, 700), "good")
  assert.equal(heroBarTone("ON_TRACK", 300, 700), "neutral")
  assert.equal(heroBarTone("OVER", 500, 700), "warning")
  assert.equal(heroBarTone("OVER", 800, 700), "over")
})

test("lastWeekLabel: sem plano, só o valor gasto", () => {
  assert.equal(lastWeekLabel({ spent: 300, limit: 400, hasPlan: false }, brl), "Semana passada: R$ 300.00 gastos")
  assert.equal(lastWeekLabel({ spent: 300, limit: 400, hasPlan: true }, brl), "Semana passada: R$ 300.00, 75% do limite")
  assert.equal(mapWeek({ lastWeek: { spent: 1, limit: 2 } }).lastWeek?.hasPlan, true)
  assert.equal(mapWeek({ lastWeek: { spent: 1, limit: 2, hasPlan: false } }).lastWeek?.hasPlan, false)
})

test("weekPills: uma pílula por semana com estado e detalhe", () => {
  const pills = weekPills(
    [
      { index: 1, weekStart: "2026-11-01", weekEnd: "2026-11-07", limit: 466.67, spent: 400, status: "DONE_UNDER" },
      { index: 2, weekStart: "2026-11-08", weekEnd: "2026-11-14", limit: 400, spent: 450, status: "DONE_OVER" },
      { index: 3, weekStart: "2026-11-15", weekEnd: "2026-11-21", limit: 500, spent: 100, status: "CURRENT" },
      { index: 4, weekStart: "2026-11-22", weekEnd: "2026-11-30", limit: 600, spent: null, status: "FUTURE" },
    ],
    brl,
  )
  assert.deepEqual(pills.map((p) => [p.short, p.kind]), [
    ["S1", "under"],
    ["S2", "over"],
    ["S3", "current"],
    ["S4", "future"],
  ])
  assert.equal(pills[3].detail, "Semana 4 · 22 – 30 nov · limite previsto R$ 600.00")
  assert.equal(pills[0].ariaLabel, "Semana 1, dentro do limite")
})

test("fabVisibleAfterScroll: esconde ao descer, mostra ao subir e no topo", () => {
  assert.equal(fabVisibleAfterScroll(100, 200, true), false)
  assert.equal(fabVisibleAfterScroll(200, 150, false), true)
  assert.equal(fabVisibleAfterScroll(200, 205, false), false) // tremor
  assert.equal(fabVisibleAfterScroll(300, 20, false), true)
})
