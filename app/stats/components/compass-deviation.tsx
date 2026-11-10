"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CaretRightIcon } from "@phosphor-icons/react"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { Skeleton } from "@/components/ui/skeleton"
import { getCategories, getTransactions } from "@/lib/storage"
import { isInternalTransfer } from "@/hooks/use-transactions"
import { useCategoryGroups } from "@/hooks/use-category-groups"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { addMonths, getPlanPeriod, parseMonthKey } from "@/lib/period"
import { asSpending, categoryKeyOf, findCategory, spendingType, UNCATEGORIZED_KEY, UNCATEGORIZED_LABEL } from "@/lib/category-utils"
import { transactionIconColor } from "@/lib/plan-layout"
import { formatMoneyNoCents } from "@/lib/closing"
import { compassDeviation, compassHeadline, type CompassRange } from "@/lib/compass"
import type { Category, Transaction } from "@/lib/types"
import { cn } from "@/lib/utils"

const PREVIOUS_MONTHS = 3
const VISIBLE_ROWS = 6
const ROW_GRID = "grid grid-cols-[8rem_1fr_4rem] items-center gap-2"

const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

// O que mudou no mês: barras que saem de um eixo central — para a direita, o
// que passou do seu normal (âmbar); para a esquerda, o que ficou abaixo
// (verde). Tocar numa categoria filtra o extrato por ela.
export function CompassDeviation({ onSelectCategory }: { onSelectCategory: (key: string) => void }) {
  const { selectedMonth, currentMonth, monthStartDay } = useSelectedMonth()
  const groups = useCategoryGroups()
  const [data, setData] = useState<{ categories: Category[]; transactions: Transaction[] } | null>(null)
  const [showAll, setShowAll] = useState(false)
  // Linha tocada: abre o balão com o detalhe (tocar de novo, ou fora, fecha).
  const [openKey, setOpenKey] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (!openKey) return
    const close = (e: PointerEvent) => {
      if (listRef.current && !listRef.current.contains(e.target as Node)) setOpenKey(null)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [openKey])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const [categories, transactions] = await Promise.all([getCategories(), getTransactions()])
      if (!cancelled) setData({ categories, transactions })
    }
    load()
    window.addEventListener("storage-update", load)
    return () => {
      cancelled = true
      window.removeEventListener("storage-update", load)
    }
  }, [])

  useEffect(() => {
    setShowAll(false)
    setOpenKey(null)
  }, [selectedMonth])

  const view = useMemo(() => {
    if (!data) return null
    const { year, month } = parseMonthKey(selectedMonth)
    const period = getPlanPeriod(year, month, monthStartDay)
    const inProgress = selectedMonth === currentMonth
    const current: CompassRange = { start: period.start, end: inProgress ? endOfDay(new Date()) : endOfDay(period.end) }
    const previous: CompassRange[] = Array.from({ length: PREVIOUS_MONTHS }, (_, i) => {
      const prev = addMonths(year, month, -(i + 1))
      const p = getPlanPeriod(prev.year, prev.month, monthStartDay)
      return { start: p.start, end: endOfDay(p.end) }
    })

    // Estorno desconta da categoria da compra (asSpending) antes de comparar.
    const expenses = data.transactions
      .map((t) => asSpending(data.categories, t))
      .filter(
        (t) =>
          t.status !== "cancelled" &&
          spendingType(data.categories, t) === "expense" &&
          !isInternalTransfer(data.categories, t) &&
          (!t.categoryId || !!findCategory(data.categories, t.categoryId)),
      )
      .map((t) => ({ key: categoryKeyOf(t), amount: t.amount, date: t.date }))

    const result = compassDeviation(expenses, current, previous)
    return { ...result, inProgress }
  }, [data, selectedMonth, currentMonth, monthStartDay])

  if (!view) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-5 w-full rounded-full" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    )
  }

  const name = (key: string) => findCategory(data!.categories, key)?.name ?? UNCATEGORIZED_LABEL
  const maxAbs = Math.max(1, ...view.rows.map((r) => Math.abs(r.diff)))
  const rows = showAll ? view.rows : view.rows.slice(0, VISIBLE_ROWS)
  const comparedTo =
    view.previousMonths === 1 ? "o mês anterior" : `a média dos ${view.previousMonths} meses anteriores`

  return (
    <section aria-labelledby="compass-title">
      <SectionTitle id="compass-title">O que mudou</SectionTitle>

      {view.previousMonths === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          A Bússola começa a apontar depois do primeiro mês com gastos: ela compara cada mês com o seu normal.
        </p>
      ) : (
        <>
          <p className="mt-3 text-base text-foreground">{compassHeadline(view.rows, name, formatMoneyNoCents, [UNCATEGORIZED_KEY])}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Comparado com {comparedTo}
            {view.inProgress ? ", até o mesmo dia do mês" : ""}.
          </p>

          {rows.length > 0 && (
            <>
              {/* Uma linha por categoria: nome | barra a partir do eixo central | diferença.
                  O eixo atravessa a lista inteira (linhas coladas, sem divisória). */}
              <div className={cn("mt-5 text-[10px] uppercase tracking-wide text-muted-foreground", ROW_GRID)} aria-hidden>
                <span />
                <span className="flex justify-between">
                  <span>abaixo</span>
                  <span>acima</span>
                </span>
                <span />
              </div>
              <ul ref={listRef} className="mt-1">
                {rows.map((row) => {
                  const up = row.diff > 0
                  const width = `${(Math.abs(row.diff) / maxAbs) * 50}%`
                  const category = findCategory(data!.categories, row.key)
                  const detail = `${formatMoneyNoCents(row.current)} · normal ${formatMoneyNoCents(row.normal)}`
                  const isOpen = openKey === row.key
                  // Ponta da barra (0–1 dentro da coluna das barras), para a seta do balão.
                  const tip = 0.5 + (up ? 1 : -1) * (Math.abs(row.diff) / maxAbs) * 0.5
                  const color = transactionIconColor(groups, category?.id, "expense")
                  return (
                    <li key={row.key} className="relative">
                      {/* Nome = filtra o extrato; barra e valor = abre o balão */}
                      <div className={cn("transition-opacity", ROW_GRID, openKey && !isOpen && "opacity-40")}>
                        <button
                          type="button"
                          onClick={() => {
                            setOpenKey(null)
                            onSelectCategory(row.key)
                          }}
                          className="group flex min-w-0 items-center gap-2 py-2 text-left text-sm text-foreground"
                          aria-label={`Ver os gastos de ${name(row.key)} no extrato`}
                        >
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                          <span className="truncate underline-offset-2 group-hover:underline">{name(row.key)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenKey(isOpen ? null : row.key)}
                          aria-expanded={isOpen}
                          className="col-span-2 grid grid-cols-[1fr_4rem] items-center gap-2 self-stretch py-2"
                          aria-label={`${name(row.key)}: ${up ? "+" : "−"}${formatMoneyNoCents(Math.abs(row.diff))} em relação ao normal (${detail}). Ver detalhe`}
                        >
                          <span className="relative block h-full min-h-5" aria-hidden>
                            <span className="absolute -inset-y-2 left-1/2 w-px bg-border" />
                            <span
                              className={cn(
                                "absolute top-1/2 h-2 -translate-y-1/2 rounded-full transition-[width] duration-500",
                                up ? "left-1/2 bg-amber-400" : "right-1/2 bg-income",
                              )}
                              style={{ width }}
                            />
                          </span>
                          <span className={cn("text-right text-sm font-semibold tabular-nums", up ? "text-attention-ink" : "text-positive-ink")}>
                            {up ? "+" : "−"}
                            {formatMoneyNoCents(Math.abs(row.diff))}
                          </span>
                        </button>
                      </div>

                      {/* Balão: o que a barra quer dizer, com atalho para o extrato */}
                      {isOpen && (
                        <div
                          role="status"
                          className="absolute inset-x-0 top-full z-20 -mt-0.5 rounded-xl border border-border bg-popover p-3 shadow-lg animate-in fade-in slide-in-from-top-1 duration-150 motion-reduce:animate-none"
                        >
                          <span
                            className="absolute -top-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-l border-t border-border bg-popover"
                            style={{ left: `calc(8.5rem + (100% - 13rem) * ${tip})` }}
                            aria-hidden
                          />
                          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
                            {name(row.key)}
                          </p>
                          <dl className="mt-2 grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <dt className="text-muted-foreground">{view.inProgress ? "Até hoje" : "No mês"}</dt>
                              <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{formatMoneyNoCents(row.current)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Seu normal</dt>
                              <dd className="mt-0.5 font-semibold tabular-nums text-foreground">{formatMoneyNoCents(row.normal)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted-foreground">Diferença</dt>
                              <dd className={cn("mt-0.5 font-semibold tabular-nums", up ? "text-attention-ink" : "text-positive-ink")}>
                                {up ? "+" : "−"}
                                {formatMoneyNoCents(Math.abs(row.diff))}
                              </dd>
                            </div>
                          </dl>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {row.normal === 0
                              ? "Você não costumava gastar aqui nesse trecho do mês."
                              : row.current === 0
                                ? "Nenhum gasto aqui ainda, quando o normal já seria " + formatMoneyNoCents(row.normal) + "."
                                : up
                                  ? `${(row.current / row.normal).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x o seu normal.`
                                  : `${Math.round((1 - row.current / row.normal) * 100)}% abaixo do seu normal.`}
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenKey(null)
                              onSelectCategory(row.key)
                            }}
                            className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Ver os gastos no extrato
                            <CaretRightIcon size={11} weight="bold" />
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
              {view.rows.length > VISIBLE_ROWS && (
                <button
                  type="button"
                  onClick={() => setShowAll((v) => !v)}
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                >
                  {showAll ? "Mostrar menos" : `Ver todas as ${view.rows.length}`}
                </button>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
