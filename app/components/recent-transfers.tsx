"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/date-utils"
import { getCards } from "@/lib/storage"
import type { Card, Transaction } from "@/lib/types"
import { getBankIcon } from "@/lib/bank-icons"
import { ArrowsLeftRight } from "@phosphor-icons/react"

interface RecentTransfersProps {
  transfers: Transaction[]
  maxItems?: number
  // Na visão "Total da Família", os cartões de origem/destino podem pertencer a
  // qualquer um dos dois parceiros — passe a lista já consolidada aqui em vez de
  // deixar buscar sozinho (que só traria os cartões da conta ativa no momento).
  cards?: Card[]
}

interface TransferPair {
  from: Transaction
  to: Transaction
}

// Cada transferência é gravada como duas transações independentes (saída na conta
// de origem, entrada na de destino), sem nenhum vínculo direto entre elas — então
// para exibir "de qual conta saiu / para qual conta foi" numa única linha, pareamos
// aqui pelo valor + pelo createdAt mais próximo entre uma despesa e uma receita.
function pairTransfers(transfers: Transaction[]): { pairs: TransferPair[]; unmatched: Transaction[] } {
  const expenses = transfers.filter((t) => t.type === "expense")
  const incomes = transfers.filter((t) => t.type === "income").slice()

  const pairs: TransferPair[] = []
  const unmatchedExpenses: Transaction[] = []

  for (const expense of expenses) {
    let bestIndex = -1
    let bestDiff = Infinity

    incomes.forEach((income, index) => {
      if (income.amount !== expense.amount) return
      const diff = Math.abs(new Date(income.createdAt).getTime() - new Date(expense.createdAt).getTime())
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

export function RecentTransfers({ transfers, maxItems = 5, cards: cardsProp }: RecentTransfersProps) {
  const [fetchedCards, setFetchedCards] = useState<Card[]>([])
  const cards = cardsProp ?? fetchedCards

  useEffect(() => {
    if (cardsProp) return
    getCards().then(setFetchedCards)
  }, [cardsProp])

  if (transfers.length === 0) return null

  const { pairs, unmatched } = pairTransfers(transfers)

  const items = [
    ...pairs.map((pair) => ({ kind: "pair" as const, pair, date: pair.from.date })),
    ...unmatched.map((t) => ({ kind: "single" as const, transaction: t, date: t.date })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, maxItems)

  return (
    <div className="rounded-[20px] bg-card p-6 shadow-sm border border-border/50">
      <h3 className="text-lg font-semibold text-foreground mb-4">Transferências Recentes</h3>

      <div className="space-y-3">
        {items.map((item) => {
          if (item.kind === "single") {
            const transaction = item.transaction
            return (
              <div
                key={transaction.id}
                className="flex items-center gap-4 p-3 rounded-[1vw] hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                  <ArrowsLeftRight size={20} weight="bold" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{transaction.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </p>
                </div>

                <p className="font-bold text-sm whitespace-nowrap text-text-primary">
                  {transaction.type === "expense" ? "-" : "+"} {formatCurrency(transaction.amount)}
                </p>
              </div>
            )
          }

          const { from, to } = item.pair
          const fromCard = cards.find((c) => c.id === from.cardId)
          const toCard = cards.find((c) => c.id === to.cardId)
          const FromIcon = fromCard ? getBankIcon(fromCard.bankName) : ArrowsLeftRight
          const ToIcon = toCard ? getBankIcon(toCard.bankName) : ArrowsLeftRight

          return (
            <div
              key={`${from.id}-${to.id}`}
              className="flex items-center gap-2 p-3 rounded-[1vw] hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: (fromCard?.color ?? "#6B7280") + "20" }}
                >
                  <FromIcon size={16} color={fromCard?.color ?? "#6B7280"} weight="fill" />
                </div>
                <span className="text-xs font-medium text-foreground truncate">
                  {fromCard?.name ?? "Conta removida"}
                </span>
              </div>

              <div className="flex flex-col items-center gap-1 shrink-0 px-1">
                <div className="w-9 h-9 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                  <ArrowsLeftRight size={18} weight="bold" />
                </div>
                <p className="font-bold text-xs whitespace-nowrap text-text-primary">{formatCurrency(from.amount)}</p>
                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {new Date(from.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                </p>
              </div>

              <div className="flex items-center gap-2 min-w-0 flex-1 justify-end text-right">
                <span className="text-xs font-medium text-foreground truncate">
                  {toCard?.name ?? "Conta removida"}
                </span>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: (toCard?.color ?? "#6B7280") + "20" }}
                >
                  <ToIcon size={16} color={toCard?.color ?? "#6B7280"} weight="fill" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
