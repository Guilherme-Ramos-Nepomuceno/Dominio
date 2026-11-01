"use client"

import { Sparkle } from "@phosphor-icons/react"
import { autoCategorizedLabel, isAutoCategorized } from "@/lib/rules"
import type { Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

// Selo "automático" para lançamentos cuja categoria não foi escolhida pela
// pessoa (regra, histórico, estabelecimento, banco ou dicionário).
export function AutoCategoryBadge({
  transaction,
  className,
}: {
  transaction: Pick<Transaction, "categoryId" | "categorizedBy">
  className?: string
}) {
  if (!isAutoCategorized(transaction)) return null
  const label = autoCategorizedLabel(transaction.categorizedBy)
  return (
    <span
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary shrink-0",
        className,
      )}
    >
      <Sparkle size={9} weight="fill" />
      automático
    </span>
  )
}
