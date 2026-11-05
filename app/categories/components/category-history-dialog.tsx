"use client"

import { useEffect, useMemo, useState } from "react"
import { X, CircleNotch, Circle, CaretDown } from "@phosphor-icons/react"
import * as PhosphorIcons from "@phosphor-icons/react"
import { getTransactions } from "@/lib/storage"
import type { Category, Transaction } from "@/lib/types"
import { formatCurrency, formatMonth } from "@/lib/date-utils"
import { dayGroupLabel, dayKey } from "@/lib/home"
import { toISODate } from "@/lib/period"
import { transactionIconColor } from "@/lib/plan-layout"
import { useCategoryGroups } from "@/hooks/use-category-groups"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { cn } from "@/lib/utils"

interface CategoryHistoryDialogProps {
  category: Category | null
  onClose: () => void
}

// Mês local "YYYY-MM" (a data vem em UTC; slice(0, 7) erraria a virada do mês).
const monthKey = (date: string) => dayKey(date).slice(0, 7)

// Histórico de uma categoria, no desenho das telas novas: mês com o total,
// dias com o total do dia e as transações em lista solta (sem caixinha).
export function CategoryHistoryDialog({ category, onClose }: CategoryHistoryDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  // Quantos meses (do mais recente para trás) estão revelados na lista.
  const [visibleMonthCount, setVisibleMonthCount] = useState(1)
  const groups = useCategoryGroups()
  const todayISO = toISODate(new Date())

  useEffect(() => {
    if (!category) return
    setLoading(true)
    setVisibleMonthCount(1)
    getTransactions().then((all) => {
      setTransactions(all)
      setLoading(false)
    })
  }, [category])

  // Esc fecha.
  useEffect(() => {
    if (!category) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [category, onClose])

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
    categoryTransactions.forEach((t) => set.add(monthKey(t.date)))
    return Array.from(set).sort().reverse()
  }, [categoryTransactions])

  const visibleMonths = months.slice(0, visibleMonthCount)
  const hasMore = visibleMonthCount < months.length

  if (!category) return null

  const isIncome = category.type === "income"
  const color = transactionIconColor(groups, category.id, category.type)
  const monthName = (key: string) => formatMonth(key).split(" ")[0].toLowerCase()
  const firstMonthTotal = categoryTransactions.filter((t) => monthKey(t.date) === months[0]).reduce((sum, t) => sum + t.amount, 0)

  return (
    <div
      className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-history-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-background w-full max-w-md rounded-t-3xl md:rounded-3xl border-t border-border md:border px-5 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200 motion-reduce:animate-none"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* @ts-ignore - componente de ícone dinâmico */}
            <CategoryIcon size={26} weight="duotone" className="shrink-0" style={{ color }} />
            <div className="min-w-0">
              <h2 id="category-history-title" className="text-lg font-semibold text-foreground truncate">
                {category.name}
              </h2>
              {months.length > 0 && (
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatCurrency(firstMonthTotal)} em {monthName(months[0])}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="p-2 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0">
            <X size={18} weight="bold" />
          </button>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto -mx-5 px-5 space-y-8">
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <CircleNotch className="animate-spin text-muted-foreground" size={24} />
            </div>
          ) : categoryTransactions.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Nenhuma transação nesta categoria ainda.</p>
          ) : (
            <>
              {visibleMonths.map((month) => {
                const monthTransactions = categoryTransactions.filter((t) => monthKey(t.date) === month)
                const monthTotal = monthTransactions.reduce((sum, t) => sum + t.amount, 0)

                const dayGroups: { day: string; items: Transaction[] }[] = []
                monthTransactions.forEach((t) => {
                  const key = dayKey(t.date)
                  const last = dayGroups[dayGroups.length - 1]
                  if (last && last.day === key) last.items.push(t)
                  else dayGroups.push({ day: key, items: [t] })
                })

                return (
                  <section key={month} aria-label={formatMonth(month)}>
                    <div className="flex items-baseline justify-between gap-3">
                      <SectionTitle>{formatMonth(month)}</SectionTitle>
                      <span className="text-xs font-semibold tabular-nums text-foreground">{formatCurrency(monthTotal)}</span>
                    </div>
                    <div className="mt-3 space-y-4">
                      {dayGroups.map((group) => (
                        <div key={group.day}>
                          <p className="flex items-baseline justify-between text-xs text-muted-foreground">
                            <span>{dayGroupLabel(group.day, todayISO)}</span>
                            {/* Total do dia só quando o mês tem mais de um dia (senão repete o do mês) */}
                            {group.items.length > 1 && dayGroups.length > 1 && (
                              <span className="tabular-nums">{formatCurrency(group.items.reduce((sum, t) => sum + t.amount, 0))}</span>
                            )}
                          </p>
                          <ul className="mt-1 divide-y divide-border">
                            {group.items.map((t) => (
                              <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                                <span className="min-w-0">
                                  <span className="block text-sm text-foreground truncate">{t.description}</span>
                                  {t.status === "pending" && <span className="block text-[11px] text-muted-foreground">Pendente</span>}
                                </span>
                                <span
                                  className={cn(
                                    "text-sm font-semibold tabular-nums shrink-0",
                                    isIncome || t.type === "income" ? "text-income" : "text-foreground",
                                  )}
                                >
                                  {t.type === "expense" ? "−" : "+"}
                                  {formatCurrency(t.amount)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}

              {hasMore ? (
                <button
                  onClick={() => setVisibleMonthCount((c) => c + 1)}
                  className="flex w-full items-center justify-center gap-1.5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ver {monthName(months[visibleMonthCount])}
                  <CaretDown size={12} weight="bold" />
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
