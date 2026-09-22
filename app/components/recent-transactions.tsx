"use client"

import { useEffect, useState } from "react"
import { formatCurrency } from "@/lib/date-utils"
import { getCategories } from "@/lib/storage"
import type { Category, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import * as PhosphorIcons from "@phosphor-icons/react"
import { Heart } from "@phosphor-icons/react"
import { EditTransactionDialog } from "./edit-transaction-dialog"

interface RecentTransactionsProps {
  transactions: Transaction[]
  maxItems?: number
  // Preenchido quando a lista veio de um clique no gráfico (filtrando por
  // dia) em vez do "mais recentes" padrão — troca o título e mostra um jeito
  // de voltar, além de clicar de novo na mesma barra no gráfico.
  filterLabel?: string
  onClearFilter?: () => void
}

export function RecentTransactions({ transactions, maxItems = 5, filterLabel, onClearFilter }: RecentTransactionsProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  useEffect(() => {
    (async () => {
      setCategories(await getCategories())
    })()
  }, [])

  const sortedTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, filterLabel ? undefined : maxItems)

  if (transactions.length === 0) {
    return (
      <div className="rounded-[20px] bg-card p-8 text-center border border-border/50">
        <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
          <PhosphorIcons.Receipt size={32} weight="light" className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {filterLabel ? `Nada em ${filterLabel}` : "Nenhuma transação ainda"}
        </h3>
        <p className="text-sm text-muted-foreground">
          {filterLabel ? "Sem transações nesse dia." : "Comece adicionando uma nova transação"}
        </p>
        {filterLabel && onClearFilter && (
          <button type="button" onClick={onClearFilter} className="mt-3 text-xs font-medium text-primary hover:underline">
            Ver as mais recentes
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[20px] bg-card p-6 shadow-sm border border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {filterLabel ? `Transações de ${filterLabel}` : "Transações Recentes"}
        </h3>
        {filterLabel && onClearFilter && (
          <button type="button" onClick={onClearFilter} className="text-xs font-medium text-primary hover:underline shrink-0">
            Ver mais recentes
          </button>
        )}
      </div>

      <div className="space-y-3">
        {sortedTransactions.map((transaction) => {
          const category = categories.find((c) => c.id === transaction.categoryId)
          const isExpense = category?.type === "expense"

          // Get icon dynamically
          const IconComponent =
            (category?.icon && PhosphorIcons[category.icon as keyof typeof PhosphorIcons]) || PhosphorIcons.Circle

          return (
            <button
              key={transaction.id}
              type="button"
              onClick={() => setEditingTransaction(transaction)}
              className="w-full flex items-center gap-4 p-3 rounded-[1vw] hover:bg-muted/50 transition-colors text-left"
            >
              <div className="w-10 h-10 flex items-center justify-center shrink-0 text-muted-foreground">
                {/* @ts-ignore - Dynamic icon component */}
                <IconComponent size={22} weight="duotone" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{transaction.description}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground">{category?.name}</p>
                  {transaction.installments && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {transaction.currentInstallment}/{transaction.installments}x
                    </span>
                  )}
                  {transaction.isCasal && (
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary">
                      <Heart size={11} weight="fill" />
                    </span>
                  )}
                </div>
              </div>

              <p className={cn("font-bold text-sm whitespace-nowrap text-text-primary",)}>
                {isExpense ? "-" : "+"} {formatCurrency(transaction.amount)}
              </p>
            </button>
          )
        })}
      </div>

      <EditTransactionDialog
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSaved={() => setEditingTransaction(null)}
      />
    </div>
  )
}
