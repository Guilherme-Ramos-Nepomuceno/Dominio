import { test } from "node:test"
import assert from "node:assert/strict"
import { applySettlements, computeCoupleSplit, coupleMonthInputs, isFixedExpense, type SplitTransaction } from "../couple-split.ts"

// Exemplo do PRD: Marina R$ 7.200, Rafael R$ 4.800, contas fixas R$ 3.000;
// Marina pagou R$ 2.380 e Rafael R$ 620.
const marina = { id: "m", income: 7200, paid: 2380 }
const rafael = { id: "r", income: 4800, paid: 620 }

test("Tudo junto: os dois ficam com o mesmo livre", () => {
  const split = computeCoupleSplit("TOGETHER", [marina, rafael], 3000)
  assert.deepEqual(split.rows.map((r) => [r.share, r.free]), [[2700, 4500], [300, 4500]])
  assert.deepEqual(split.transfer, { fromId: "m", toId: "r", amount: 320 })
})

test("Proporcional: 60% / 40% da renda", () => {
  const split = computeCoupleSplit("PROPORTIONAL", [marina, rafael], 3000)
  assert.deepEqual(split.rows.map((r) => [r.share, r.sharePct, r.free]), [[1800, 60, 5400], [1200, 40, 3600]])
  assert.deepEqual(split.transfer, { fromId: "r", toId: "m", amount: 580 })
})

test("Meio a meio: metade das contas para cada um", () => {
  const split = computeCoupleSplit("HALF", [marina, rafael], 3000)
  assert.deepEqual(split.rows.map((r) => [r.share, r.free]), [[1500, 5700], [1500, 3300]])
  assert.deepEqual(split.transfer, { fromId: "r", toId: "m", amount: 880 })
})

test("Proporcional sem renda nenhuma cai para meio a meio", () => {
  const split = computeCoupleSplit("PROPORTIONAL", [{ id: "a", income: 0, paid: 0 }, { id: "b", income: 0, paid: 100 }], 100)
  assert.deepEqual(split.rows.map((r) => r.share), [50, 50])
  assert.deepEqual(split.transfer, { fromId: "a", toId: "b", amount: 50 })
})

test("Cada um pagou exatamente a sua parte: sem acerto", () => {
  const split = computeCoupleSplit("HALF", [{ id: "a", income: 3000, paid: 500 }, { id: "b", income: 2000, paid: 500 }], 1000)
  assert.equal(split.transfer, null)
})

test("applySettlements: imprevisto aumenta o acerto e sobra a diferença", () => {
  const status = applySettlements({ fromId: "r", toId: "m", amount: 640 }, ["m", "r"], [{ fromUserId: "r", toUserId: "m", amount: 580 }])
  assert.deepEqual(status.settled, { fromId: "r", toId: "m", amount: 580 })
  assert.deepEqual(status.remaining, { fromId: "r", toId: "m", amount: 60 })
})

test("applySettlements: acerto diminuiu, quem recebeu devolve", () => {
  const status = applySettlements({ fromId: "r", toId: "m", amount: 540 }, ["m", "r"], [{ fromUserId: "r", toUserId: "m", amount: 580 }])
  assert.deepEqual(status.remaining, { fromId: "m", toId: "r", amount: 40 })
})

test("applySettlements: tudo acertado", () => {
  const status = applySettlements({ fromId: "r", toId: "m", amount: 580 }, ["m", "r"], [{ fromUserId: "r", toUserId: "m", amount: 580 }])
  assert.equal(status.remaining, null)
})

test("isFixedExpense: recorrente ou parcelada", () => {
  assert.equal(isFixedExpense({ recurrence: "monthly" }), true)
  assert.equal(isFixedExpense({ recurrence: "none", installments: 10 }), true)
  assert.equal(isFixedExpense({ recurrence: "none", installments: 1 }), false)
})

test("coupleMonthInputs: renda sem transferências, só fixas do casal, pagador", () => {
  const inNov = (d: string) => d.startsWith("2026-11")
  const tx = (t: Partial<SplitTransaction>): SplitTransaction => ({ id: Math.random().toString(), type: "expense", amount: 0, date: "2026-11-05", status: "paid", ownerId: "m", ...t })
  const inputs = coupleMonthInputs(
    [
      tx({ type: "income", amount: 7200, ownerId: "m" }),
      tx({ type: "income", amount: 4800, ownerId: "r", status: "pending" }),
      tx({ type: "income", amount: 500, ownerId: "r", categoryName: "Transferência" }),
      tx({ amount: 1900, isCasal: true, recurrence: "monthly", ownerId: "m" }),
      tx({ amount: 120, isCasal: true, recurrence: "monthly", ownerId: "m", paidByUserId: "r" }),
      tx({ amount: 480, isCasal: true, recurrence: "monthly", ownerId: "m", status: "pending" }),
      tx({ amount: 90, isCasal: true, recurrence: "none", ownerId: "r" }), // variável: fora
      tx({ amount: 300, isCasal: false, recurrence: "monthly", ownerId: "r" }), // pessoal: fora
      tx({ amount: 60, recurrence: "monthly", ownerId: null }), // direto na conta do casal
      tx({ amount: 999, isCasal: true, recurrence: "monthly", date: "2026-10-30" }), // outro mês
      tx({ amount: 50, isCasal: true, recurrence: "monthly", status: "cancelled" }),
    ],
    ["m", "r"],
    inNov,
  )
  assert.deepEqual(inputs.income, { m: 7200, r: 4800 })
  assert.deepEqual(inputs.incomeExpected, { m: false, r: true })
  assert.equal(inputs.sharedTotal, 1900 + 120 + 480 + 60)
  assert.deepEqual(inputs.paid, { m: 1900, r: 120 })
  assert.deepEqual(inputs.scheduled, { m: 480, r: 0 })
})

test("Conta agendada conta para o dono: ninguém pagou ainda, quem não tem a conta passa a parte", () => {
  const split = computeCoupleSplit("TOGETHER", [{ id: "m", income: 7200, paid: 0, scheduled: 2681.34 }, { id: "r", income: 7200, paid: 0 }], 2681.34)
  assert.deepEqual(split.transfer, { fromId: "r", toId: "m", amount: 1340.67 })
})
