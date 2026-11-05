import { test } from "node:test"
import assert from "node:assert/strict"
import { groupPending, pendingBucket, pendingDueLabel, pendingSummary } from "../pending.ts"

const TODAY = "2026-11-05"

test("pendingBucket: atrasada, hoje, amanhã, próximos 7 dias e depois", () => {
  assert.equal(pendingBucket("2026-11-04", TODAY), "overdue")
  assert.equal(pendingBucket("2026-11-05", TODAY), "today")
  assert.equal(pendingBucket("2026-11-06", TODAY), "tomorrow")
  assert.equal(pendingBucket("2026-11-12", TODAY), "soon")
  assert.equal(pendingBucket("2026-11-13", TODAY), "later")
  assert.equal(pendingBucket("2026-12-01", TODAY), "later")
})

test("pendingDueLabel: relativo perto de hoje, data curta depois", () => {
  assert.equal(pendingDueLabel("2026-11-05", TODAY), "hoje")
  assert.equal(pendingDueLabel("2026-11-06", TODAY), "amanhã")
  assert.equal(pendingDueLabel("2026-11-04", TODAY), "venceu ontem")
  assert.equal(pendingDueLabel("2026-11-02", TODAY), "venceu há 3 dias")
  assert.equal(pendingDueLabel("2026-11-12", TODAY), "qui, 12 nov")
})

test("groupPending: ordem do prazo e total só das despesas", () => {
  const groups = groupPending(
    [
      { id: "a", date: "2026-11-20", amount: 100, type: "expense" },
      { id: "b", date: "2026-11-01", amount: 50, type: "expense" },
      { id: "c", date: "2026-11-05", amount: 3000, type: "income" },
      { id: "d", date: "2026-11-05", amount: 80, type: "expense" },
      { id: "e", date: "2026-11-03", amount: 20, type: "expense" },
    ],
    TODAY,
  )
  assert.deepEqual(
    groups.map((g) => [g.bucket, g.items.map((t) => t.id), g.total]),
    [
      ["overdue", ["b", "e"], 70],
      ["today", ["c", "d"], 80],
      ["later", ["a"], 100],
    ],
  )
})

test("pendingSummary: a pagar, a receber e atrasadas", () => {
  const summary = pendingSummary(
    [
      { date: "2026-11-01", amount: 50, type: "expense" },
      { date: "2026-11-10", amount: 100, type: "expense" },
      { date: "2026-11-03", amount: 200, type: "income" },
    ],
    TODAY,
  )
  assert.deepEqual(summary, { toPay: 150, toReceive: 200, overdueCount: 2, overdueAmount: 50 })
})
