"use client"
import { Trash } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { getCategories, deleteTransaction } from "@/lib/storage"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"
import * as PhosphorIcons from "@phosphor-icons/react"

interface TransactionListProps {
  transactions: Transaction[]
  onUpdate?: () => void
}

export function TransactionList({ transactions, onUpdate }: TransactionListProps) {
  const categories = getCategories()

  const handleDelete = (id: string) => {
    if (confirm("Deseja realmente excluir esta transação?")) {
      deleteTransaction(id)
      onUpdate?.()
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="rounded-[20px] bg-card p-8 text-center border border-border/50">
        <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
          <PhosphorIcons.Receipt size={32} weight="light" className="text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Nenhuma transação</h3>
        <p className="text-sm text-muted-foreground">Comece adicionando uma nova transação</p>
      </div>
    )
  }

  const sortedTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return (
    <div className="space-y-3">
      {sortedTransactions.map((transaction) => {
        const category = categories.find((c) => c.id === transaction.categoryId)
        const isExpense = category?.type === "expense"
        const IconComponent =
          (category?.icon && PhosphorIcons[category.icon as keyof typeof PhosphorIcons]) || PhosphorIcons.Circle

        return (
          <div
            key={transaction.id}
            className="flex items-center gap-4 p-4 rounded-[1vw] bg-card border border-border/50 hover:shadow-sm transition-all group"
          >
            <div
              className="w-12 h-12 rounded-[1vw] flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${category?.color}20`, color: category?.color }}
            >
              {/* @ts-ignore */}
              <IconComponent size={24} weight="bold" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{transaction.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{category?.name}</p>
                {transaction.installments && (
                  <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium">
                    {transaction.currentInstallment}/{transaction.installments}x
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <p className={cn("font-bold text-lg whitespace-nowrap", isExpense ? "text-expense" : "text-income")}>
                {isExpense ? "-" : "+"} {formatCurrency(transaction.amount)}
              </p>

              <button
                onClick={() => handleDelete(transaction.id)}
                className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-all"
                title="Excluir"
              >
                <Trash weight="bold" size={18} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
