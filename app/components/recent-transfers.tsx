"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/date-utils"
import { getCards } from "@/lib/storage"
import type { Card, Transaction } from "@/lib/types"
import { getBankIcon, bankLogos } from "@/lib/bank-icons"
import { pairTransfers } from "@/lib/pair-transfers"
import { ArrowsLeftRight } from "@phosphor-icons/react"

interface RecentTransfersProps {
  transfers: Transaction[]
  maxItems?: number
  // Na visão "Total da Família", os cartões de origem/destino podem pertencer a
  // qualquer um dos dois parceiros — passe a lista já consolidada aqui em vez de
  // deixar buscar sozinho (que só traria os cartões da conta ativa no momento).
  cards?: Card[]
}

export function RecentTransfers({ transfers, maxItems = 5, cards: cardsProp }: RecentTransfersProps) {
  const [fetchedCards, setFetchedCards] = useState<Card[]>([])
  const cards = cardsProp ?? fetchedCards

  useEffect(() => {
    if (cardsProp) return
    getCards().then(setFetchedCards)
  }, [cardsProp])

  if (transfers.length === 0) return null

  const { pairs, unmatched } = pairTransfers(transfers, {
    getType: (t) => t.type,
    getAmount: (t) => t.amount,
    getTimestamp: (t) => new Date(t.createdAt).getTime(),
    getCardId: (t) => t.cardId ?? t.id,
  })

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
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{fromCard?.name ?? "Conta removida"}</p>
                  {fromCard && <p className="text-[10px] text-muted-foreground truncate">{bankLogos[fromCard.bankName]}</p>}
                </div>
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
                <div className="min-w-0 text-right">
                  <p className="text-xs font-medium text-foreground truncate">{toCard?.name ?? "Conta removida"}</p>
                  {toCard && <p className="text-[10px] text-muted-foreground truncate">{bankLogos[toCard.bankName]}</p>}
                </div>
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
