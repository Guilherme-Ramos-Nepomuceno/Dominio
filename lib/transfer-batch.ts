// Resumo das transferências entre contas que vão ser confirmadas de uma vez:
// quantas, quanto somam e entre quem. Lógica pura — sem aliases "@/" — para
// rodar no test runner do Node.

export interface TransferBatchPair {
  from: { amount: number; cardId: string }
  to: { amount: number; cardId: string }
}

export interface TransferBatchSummary {
  count: number
  total: number
  // Pessoas envolvidas além de você, na ordem em que aparecem.
  others: string[]
  // "Entre as suas contas", "Entre você e Ana" ou "Entre você, Ana e Beto".
  label: string
}

// `ownerOf` devolve o nome do dono da conta, ou undefined quando a conta é sua.
export function transferBatchSummary(
  pairs: TransferBatchPair[],
  ownerOf: (cardId: string) => string | undefined,
): TransferBatchSummary {
  const others: string[] = []
  for (const pair of pairs) {
    for (const cardId of [pair.from.cardId, pair.to.cardId]) {
      const owner = ownerOf(cardId)
      if (owner && !others.includes(owner)) others.push(owner)
    }
  }
  const total = Math.round(pairs.reduce((sum, p) => sum + p.from.amount, 0) * 100) / 100
  const label = others.length === 0 ? "Entre as suas contas" : `Entre ${joinNames(["você", ...others])}`
  return { count: pairs.length, total, others, label }
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("")
  return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`
}
