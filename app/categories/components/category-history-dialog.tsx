"use client"

import { useEffect, useMemo, useState } from "react"
import { X, CircleNotch, Circle } from "@phosphor-icons/react"
import * as PhosphorIcons from "@phosphor-icons/react"
import { getTransactions } from "@/lib/storage"
import type { Category, Transaction } from "@/lib/types"
import { formatCurrency, formatMonth } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface CategoryHistoryDialogProps {
  category: Category | null
  onClose: () => void
}

function dayKey(dateString: string) {
  return dateString.slice(0, 10)
}

function formatDayHeader(dateString: string) {
  return new Date(dateString).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })
}

export function CategoryHistoryDialog({ category, onClose }: CategoryHistoryDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  // Quantos meses (do mais recente para trás) estão revelados na lista.
  const [visibleMonthCount, setVisibleMonthCount] = useState(1)

  useEffect(() => {
    if (!category) return
    setLoading(true)
    setVisibleMonthCount(1)
    getTransactions().then((all) => {
      setTransactions(all)
      setLoading(false)
    })
  }, [category])

  const CategoryIcon = category?.icon
    ? ((PhosphorIcons[category.icon as keyof typeof PhosphorIcons] as typeof Circle) ?? Circle)
    : Circle

  const categoryTransactions = useMemo(() => {
    if (!category) return []
    return transactions
      .filter((t) => t.categoryId === category.id && t.status !== "cancelled")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [transactions, category])

  // Meses com transações, do mais recente para o mais antigo.
  const months = useMemo(() => {
    const set = new Set<string>()
    categoryTransactions.forEach((t) => set.add(t.date.slice(0, 7)))
    return Array.from(set).sort().reverse()
  }, [categoryTransactions])

  const visibleMonths = months.slice(0, visibleMonthCount)
  const hasMore = visibleMonthCount < months.length

  const visibleTransactions = useMemo(
    () => categoryTransactions.filter((t) => visibleMonths.includes(t.date.slice(0, 7))),
    [categoryTransactions, visibleMonths],
  )
  const visibleTotal = visibleTransactions.reduce((sum, t) => sum + t.amount, 0)

  if (!category) return null

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 flex items-center justify-center shrink-0 text-muted-foreground">
              {/* @ts-ignore - Dynamic icon component */}
              <CategoryIcon size={24} weight="duotone" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{category.name}</h2>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(visibleTotal)} exibido{visibleMonths.length > 1 ? ` (${visibleMonths.length} meses)` : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0">
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 space-y-6">
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <CircleNotch className="animate-spin text-muted-foreground" size={28} />
            </div>
          ) : categoryTransactions.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              Nenhuma transação nesta categoria ainda.
            </div>
          ) : (
            <>
              {visibleMonths.map((month) => {
                const monthTransactions = categoryTransactions.filter((t) => t.date.slice(0, 7) === month)

                const dayGroups: { day: string; items: Transaction[] }[] = []
                monthTransactions.forEach((t) => {
                  const key = dayKey(t.date)
                  const last = dayGroups[dayGroups.length - 1]
                  if (last && last.day === key) last.items.push(t)
                  else dayGroups.push({ day: key, items: [t] })
                })

                return (
                  <div key={month}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      {formatMonth(month)}
                    </h3>
                    <div className="space-y-4">
                      {dayGroups.map((group) => (
                        <div key={group.day}>
                          <p className="text-xs text-muted-foreground mb-2 capitalize">
                            {formatDayHeader(group.items[0].date)}
                          </p>
                          <div className="space-y-2">
                            {group.items.map((t) => (
                              <div
                                key={t.id}
                                className="flex items-center justify-between gap-3 p-3 rounded-xl bg-muted/40"
                              >
                                <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                                <p
                                  className={cn(
                                    "text-sm font-bold shrink-0",
                                    t.type === "expense" ? "text-expense" : "text-income",
                                  )}
                                >
                                  {t.type === "expense" ? "-" : "+"}
                                  {formatCurrency(t.amount)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              {hasMore ? (
                <button
                  onClick={() => setVisibleMonthCount((c) => c + 1)}
                  className="w-full py-3 rounded-[1vw] border border-black/10 dark:border-white/10 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  Ver mais ({formatMonth(months[visibleMonthCount])})
                </button>
              ) : (
                <p className="text-center text-xs text-muted-foreground py-2">Início do histórico</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
