"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { formatCurrency } from "@/lib/date-utils"
import { groupByDay } from "@/lib/home"
import { toISODate } from "@/lib/period"
import { getCategories } from "@/lib/storage"
import type { Category, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import * as PhosphorIcons from "@phosphor-icons/react"
import { Heart } from "@phosphor-icons/react"
import { EditTransactionDialog } from "./edit-transaction-dialog"
import { findCategory, transactionCategoryLabel } from "@/lib/category-utils"
import { AutoCategoryBadge } from "@/components/rules/auto-category-badge"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { useCategoryGroups } from "@/hooks/use-category-groups"
import { transactionIconColor } from "@/lib/plan-layout"
import { useAccount } from "@/components/account/account-context"

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
  // Na conta do casal todo lançamento já é do casal: o coração só repete.
  const showCasal = useAccount().selection.type !== "couple"
  const [categories, setCategories] = useState<Category[]>([])
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const groups = useCategoryGroups()

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
      <div className="py-8 text-center">
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
    <section aria-labelledby="home-transactions-title">
      <div className="flex items-baseline justify-between mb-2">
        <SectionTitle id="home-transactions-title">
          {filterLabel ? `Transações de ${filterLabel}` : "Transações recentes"}
        </SectionTitle>
        {filterLabel && onClearFilter ? (
          <button type="button" onClick={onClearFilter} className="text-xs font-medium text-primary hover:underline shrink-0">
            Ver mais recentes
          </button>
        ) : (
          // O extrato completo, com busca e filtros, fica na Bússola.
          <Link href="/stats" className="text-xs font-medium text-primary hover:underline shrink-0">
            Ver todas
          </Link>
        )}
      </div>

      <div className="space-y-3">
        {groupByDay(sortedTransactions, toISODate(new Date())).map((group) => (
          <section key={group.key} aria-label={group.label}>
            <h3 className="pt-1 text-xs font-medium text-muted-foreground">{group.label}</h3>
            <div className="divide-y divide-border">
              {group.items.map((transaction) => {
                const category = findCategory(categories, transaction.categoryId)
                // Tipo da categoria quando existe (comportamento de antes); sem
                // categoria, o tipo da própria transação.
                const isExpense = (category?.type ?? transaction.type) === "expense"
                const isUncategorized = !transaction.categoryId

                // Get icon dynamically
                const IconComponent =
                  (category?.icon && PhosphorIcons[category.icon as keyof typeof PhosphorIcons]) ||
                  (isUncategorized ? PhosphorIcons.Tag : PhosphorIcons.Circle)

                return (
                  <button
                    key={transaction.id}
                    type="button"
                    onClick={() => setEditingTransaction(transaction)}
                    className="w-full flex items-center gap-3 py-3 text-left hover:opacity-80 transition-opacity"
                  >
                    {/* Ícone na cor do grupo do plano (a mesma da barra do mês). */}
                    <div
                      className={cn("w-8 h-8 flex items-center justify-center shrink-0", isUncategorized && "opacity-60")}
                      style={{ color: transactionIconColor(groups, transaction.categoryId, isExpense ? "expense" : "income") }}
                    >
                      {/* @ts-ignore - Dynamic icon component */}
                      <IconComponent size={22} weight="duotone" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className={cn("text-xs text-muted-foreground", isUncategorized && "italic opacity-80")}>
                          {transactionCategoryLabel(categories, transaction)}
                        </p>
                        <AutoCategoryBadge transaction={transaction} />
                        {transaction.installments && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            {transaction.currentInstallment}/{transaction.installments}x
                          </span>
                        )}
                        {showCasal && transaction.isCasal && (
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
          </section>
        ))}
      </div>

      <EditTransactionDialog
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
        onSaved={() => setEditingTransaction(null)}
      />
    </section>
  )
}
