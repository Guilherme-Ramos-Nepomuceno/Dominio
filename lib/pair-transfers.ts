// Uma transferência entre contas é gravada como dois lançamentos independentes
// (saída na origem, entrada no destino), sem nenhum vínculo direto entre eles —
// pareamos aqui pelo valor exato + pelo instante mais próximo entre uma despesa e
// uma receita, pra poder exibir "de onde saiu / pra onde foi" numa única linha em
// vez de duas soltas. Compartilhado entre a Home (transações já confirmadas) e a
// revisão do bank-sync (pendências da Pluggy, ainda não confirmadas).
export interface TransferPair<T> {
  from: T
  to: T
}

export interface PairTransfersOptions<T> {
  getType: (item: T) => "income" | "expense"
  getAmount: (item: T) => number
  getTimestamp: (item: T) => number
  // Opcional: quando informado, nunca pareia duas pontas do MESMO cartão —
  // débito pagando o crédito do próprio cartão combinado é pagamento de
  // fatura, não uma transferência entre contas, mesmo que o valor bata por
  // coincidência com outra movimentação qualquer.
  getCardId?: (item: T) => string
}

export function pairTransfers<T>(
  items: T[],
  { getType, getAmount, getTimestamp, getCardId }: PairTransfersOptions<T>,
): { pairs: TransferPair<T>[]; unmatched: T[] } {
  const expenses = items.filter((t) => getType(t) === "expense")
  const incomes = items.filter((t) => getType(t) === "income").slice()

  const pairs: TransferPair<T>[] = []
  const unmatchedExpenses: T[] = []

  for (const expense of expenses) {
    let bestIndex = -1
    let bestDiff = Infinity

    incomes.forEach((income, index) => {
      if (getCardId && getCardId(income) === getCardId(expense)) return
      if (getAmount(income) !== getAmount(expense)) return
      const diff = Math.abs(getTimestamp(income) - getTimestamp(expense))
      if (diff < bestDiff) {
        bestDiff = diff
        bestIndex = index
      }
    })

    if (bestIndex >= 0) {
      pairs.push({ from: expense, to: incomes[bestIndex] })
      incomes.splice(bestIndex, 1)
    } else {
      unmatchedExpenses.push(expense)
    }
  }

  return { pairs, unmatched: [...unmatchedExpenses, ...incomes] }
}
