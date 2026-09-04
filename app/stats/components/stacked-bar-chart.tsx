"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { CaretLeftIcon, CaretRightIcon, CircleNotchIcon, TrendUpIcon } from "@phosphor-icons/react"
import { getCategories, getSettings, getTransactions } from "@/lib/storage"
import { isInternalTransfer } from "@/hooks/use-transactions"
import type { Transaction, Category } from "@/lib/types"
import { formatCurrency, formatShortMonth, getNextMonth, getPreviousMonth } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

interface StackedBarChartProps {
  currentMonth: string
  threshold?: number
  onThresholdChange?: (value: number) => void
  onMonthChange?: (month: string) => void
}

interface CategoryData {
  categoryId: string
  name: string
  amount: number
}

// Todas as fatias usam o mesmo tom (--expense); a intensidade decresce por
// posição no ranking (maior gasto = mais opaco), formando uma escala tipo heatmap.
const MIN_SEGMENT_OPACITY = 0.32

function segmentIntensity(rank: number, total: number) {
  if (total <= 1) return 1
  return 1 - (rank / (total - 1)) * (1 - MIN_SEGMENT_OPACITY)
}

export function StackedBarChart({
  currentMonth,
  threshold: customThreshold,
  onThresholdChange,
  onMonthChange,
}: StackedBarChartProps) {
  
  const [data, setData] = useState<{
    settings: any;
    categories: Category[];
    allTransactions: Transaction[];
  } | null>(null);

  const [isEditingThreshold, setIsEditingThreshold] = useState(false)
  const [thresholdInput, setThresholdInput] = useState("")
  const [activeColumn, setActiveColumn] = useState<string | null>(null)
  
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      const [settings, categories, allTransactions] = await Promise.all([
        getSettings(),
        getCategories(),
        getTransactions(),
      ])

      if (cancelled) return

      setData({ settings, categories, allTransactions });

      const initialThreshold = customThreshold ?? settings.spendingGoal;
      setThresholdInput(initialThreshold.toString());
    }

    loadData()

    window.addEventListener("storage-update", loadData)
    return () => {
      cancelled = true
      window.removeEventListener("storage-update", loadData)
    }
  }, [customThreshold]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chartRef.current && !chartRef.current.contains(event.target as Node)) {
        setActiveColumn(null)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const monthsToShow = useMemo(() => {
    const prev1 = getPreviousMonth(currentMonth)
    const prev2 = getPreviousMonth(prev1)
    const next1 = getNextMonth(currentMonth)
    const next2 = getNextMonth(next1)
    return [prev2, prev1, currentMonth, next1, next2]
  }, [currentMonth])

  if (!data) {
    return (
        <div className="rounded-3xl bg-card p-8 shadow-sm border border-border/40 h-112.5 flex items-center justify-center">
            <CircleNotchIcon className="animate-spin text-muted-foreground" size={32} />
        </div>
    );
  }

  const { settings, categories, allTransactions } = data;
  const threshold = customThreshold ?? settings.spendingGoal

  const getMonthData = (targetMonthStr: string) => {
    const result: CategoryData[] = []
    const [targetYear, targetMonth] = targetMonthStr.split('-').map(Number)

    allTransactions.forEach((transaction) => {
      if (transaction.type !== 'expense') return
      if (transaction.status === 'cancelled') return
      if (isInternalTransfer(categories, transaction)) return

      const transDate = new Date(transaction.date)
      const transYear = transDate.getFullYear()
      const transMonth = transDate.getMonth() + 1

      const installments = transaction.installments && transaction.installments > 1 ? transaction.installments : 1
      let amountToAdd = 0

      if (installments === 1) {
        if (transaction.date.startsWith(targetMonthStr)) {
          amountToAdd = transaction.amount
        }
      } else {
        const monthDiff = (targetYear - transYear) * 12 + (targetMonth - transMonth)
        if (monthDiff >= 0 && monthDiff < installments) {
           amountToAdd = transaction.amount / installments
        }
      }

      if (amountToAdd > 0) {
        const category = categories.find((c) => c.id === transaction.categoryId)
        if (!category) return

        const existing = result.find((d) => d.categoryId === category.id)
        if (existing) {
          existing.amount += amountToAdd
        } else {
          result.push({
            categoryId: category.id,
            name: category.name,
            amount: amountToAdd,
          })
        }
      }
    })

    return result.sort((a, b) => b.amount - a.amount)
  }

  const chartData = monthsToShow.map(month => {
    const categoriesData = getMonthData(month)
    const total = categoriesData.reduce((sum, cat) => sum + cat.amount, 0)
    return {
      month,
      label: formatShortMonth(month),
      categories: categoriesData,
      total,
      isCurrent: month === currentMonth
    }
  })

  // Garante que o gráfico nunca ultrapasse o topo (respiro de 20%)
  const maxTotal = Math.max(...chartData.map(d => d.total), threshold)
  const maxValue = maxTotal > 0 ? maxTotal * 1.2 : 100

  const handleThresholdSave = () => {
    const newValue = Number.parseFloat(thresholdInput)
    if (!isNaN(newValue) && newValue > 0) {
      onThresholdChange?.(newValue)
    }
    setIsEditingThreshold(false)
  }

  const thresholdPercentage = Math.min((threshold / maxValue) * 100, 100)

  const renderColumn = (monthData: typeof chartData[0], index: number) => {
    const isColumnActive = activeColumn === monthData.month
    
    // CORREÇÃO 1: Em telas pequenas (mobile), escondemos o primeiro (0) e o último (4) mês.
    // Isso libera espaço para os textos de valores altos não quebrarem o layout.
    const isHiddenOnMobile = index === 0 || index === 4

    return (
      <div 
        key={monthData.month} 
        className={cn(
            "flex-1 flex-col items-center group/column relative z-10",
            // Se for mobile, esconde os extremos. Se for tablet/desk (sm), mostra flex
            isHiddenOnMobile ? "hidden sm:flex" : "flex"
        )}
      >
        
        {/* Container da Barra - Altura Fixa */}
        <div className="w-full h-64 relative flex items-end justify-center">
          
          <div className={cn(
            "w-12 sm:w-14 h-full flex flex-col-reverse justify-start relative transition-transform duration-300 group-hover/column:scale-[1.02]",
            isColumnActive ? "z-50 brightness-110" : "group-hover/column:z-50"
          )}>

            {monthData.categories.length === 0 ? (
               <div className="h-1 w-full bg-border/50 rounded-full mb-0" />
            ) : (
                monthData.categories.map((cat, index) => {
                const heightPercentage = (cat.amount / maxValue) * 100
                const isTop = index === monthData.categories.length - 1
                const isBottom = index === 0

                const intensity = segmentIntensity(index, monthData.categories.length)

                if (heightPercentage <= 0) return null;

                return (
                  <div
                    key={cat.categoryId}
                    onClick={(e) => {
                        e.stopPropagation()
                        setActiveColumn(isColumnActive ? null : monthData.month)
                    }}
                    className={cn(
                        "relative w-full transition-all duration-300 hover:brightness-110 group/segment cursor-pointer",
                        "hover:z-20",
                        isTop ? "rounded-t-[6px]" : "",
                        isBottom ? "rounded-b-[6px]" : "",
                        !isBottom ? "border-b-2 border-card" : ""
                    )}
                    style={{
                      backgroundColor: "var(--expense)",
                      height: `${heightPercentage}%`,
                      opacity: intensity * (monthData.isCurrent ? 1 : 0.6),
                    }}
                  >
                    {/* Tooltip individual (hover, desktop) */}
                    <div className={cn(
                        "absolute left-1/2 -translate-x-1/2 bottom-[110%] transition-all duration-200 pointer-events-none min-w-35",
                        "z-100 opacity-0 translate-y-2 scale-95",
                        "group-hover/segment:opacity-100 group-hover/segment:translate-y-0 group-hover/segment:scale-100"
                    )}>
                        <div className="bg-[#1a1a1a]/95 backdrop-blur-md text-white border border-white/10 rounded-xl px-4 py-3 shadow-2xl relative">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: "var(--expense)", opacity: intensity }} />
                                <p className="text-xs font-medium text-gray-300 truncate max-w-25">{cat.name}</p>
                            </div>
                            <div className="flex justify-between items-end gap-4">
                                <div>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Valor</p>
                                    <p className="text-sm font-bold">{formatCurrency(cat.amount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">%</p>
                                    <p className="text-xs font-semibold text-gray-300">{((cat.amount / monthData.total) * 100).toFixed(0)}%</p>
                                </div>
                            </div>
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#1a1a1a]/95"></div>
                        </div>
                    </div>
                  </div>
                )
              })
            )}

            {/* Tooltip agregado (clique, mobile) — todos os gastos do mês, um embaixo do outro */}
            {monthData.categories.length > 0 && (
              <div
                  className={cn(
                      "absolute left-1/2 -translate-x-1/2 transition-all duration-200 min-w-40 max-w-56",
                      "z-100",
                      isColumnActive
                          ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
                          : "opacity-0 translate-y-2 scale-95 pointer-events-none"
                  )}
                  style={{ bottom: `calc(${(monthData.total / maxValue) * 100}% + 8px)` }}
              >
                  <div className="bg-[#1a1a1a]/95 backdrop-blur-md text-white border border-white/10 rounded-xl px-3 py-3 shadow-2xl max-h-64 overflow-y-auto">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-2 pb-2 border-b border-white/10">
                          {monthData.label} · Total {formatCurrency(monthData.total)}
                      </p>
                      <div className="space-y-2">
                          {monthData.categories.slice().reverse().map((cat, i) => {
                              const catIndex = monthData.categories.length - 1 - i
                              const catIntensity = segmentIntensity(catIndex, monthData.categories.length)
                              return (
                                  <div key={cat.categoryId} className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-2 min-w-0">
                                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: "var(--expense)", opacity: catIntensity }} />
                                          <span className="text-xs text-gray-200 truncate">{cat.name}</span>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                          <span className="text-xs font-bold">{formatCurrency(cat.amount)}</span>
                                          <span className="text-[10px] text-gray-400 w-8 text-right">{((cat.amount / monthData.total) * 100).toFixed(0)}%</span>
                                      </div>
                                  </div>
                              )
                          })}
                      </div>
                  </div>
              </div>
            )}
          </div>
        </div>

        {/* Labels e Totais */}
        <div className="mt-4 text-center space-y-1 relative z-10 w-full">
          <p className={cn(
              "text-xs font-bold uppercase tracking-wider transition-colors", 
              monthData.isCurrent ? "text-primary" : "text-muted-foreground/60"
            )}>
            {monthData.label}
          </p>
          {/* CORREÇÃO 2: Fonte menor no mobile e 'truncate' para garantir que não empurre a largura */}
          <p className={cn(
              "font-bold transition-all truncate px-1",
              "text-xs sm:text-sm", // Fonte um pouco menor no mobile
              monthData.total > threshold ? "text-red-500" : "text-foreground",
              monthData.isCurrent ? "opacity-100" : "opacity-50"
          )}>
            {formatCurrency(monthData.total)}
          </p>
        </div>
      </div>
    )
  }

  return (
    // Adicionado overflow-hidden para garantir que nada vaze do card
    <div ref={chartRef} className="rounded-3xl bg-card p-6 sm:p-8 shadow-sm border border-border/50 relative overflow-hidden">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-20">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            Fluxo de Gastos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
             {/* Texto adaptativo para indicar quantos meses estão visíveis */}
             <span className="sm:hidden">Trimestral (3 Meses)</span>
             <span className="hidden sm:inline">Comparativo (5 Meses)</span>
          </p>
        </div>

        {/* Editor de Meta */}
        <div className="flex items-center gap-3 bg-muted/30 p-2 pr-4 rounded-xl border border-border/50">
            <div className="bg-background p-2 rounded-lg shadow-sm">
                {isEditingThreshold ? (
                    <TrendUpIcon className="text-primary animate-pulse" size={20} />
                ) : (
                    <TrendUpIcon className="text-muted-foreground" size={20} />
                )}
            </div>
            <div onClick={() => setIsEditingThreshold(true)} className="cursor-pointer group">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Limite Mensal</p>
                {isEditingThreshold ? (
                    <input
                        type="number"
                        value={thresholdInput}
                        onChange={(e) => setThresholdInput(e.target.value)}
                        onBlur={handleThresholdSave}
                        onKeyDown={(e) => e.key === "Enter" && handleThresholdSave()}
                        className="w-24 bg-transparent border-b border-primary focus:outline-none text-sm font-bold"
                        autoFocus
                    />
                ) : (
                    <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                        {formatCurrency(threshold)}
                        <span className="opacity-0 group-hover:opacity-100 text-[10px] text-muted-foreground transition-opacity">Editar</span>
                    </p>
                )}
            </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="relative mt-4 z-30">
        
        {/* Layer de Fundo e Meta */}
        <div className="absolute top-0 left-0 right-0 h-64 pointer-events-none z-0">
             {/* Linha de Meta (Threshold) */}
            <div
                className="absolute left-0 right-0 border-t-2 border-dashed border-red-400/50 transition-all duration-500 ease-out"
                style={{ bottom: `${thresholdPercentage}%` }}
            >
                <div className="absolute right-0 -top-3 bg-red-400/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                    Meta
                </div>
            </div>
        </div>

        {/* Colunas */}
        <div className="flex gap-2 sm:gap-6 items-end justify-between min-h-75">
          {chartData.map((data, index) => renderColumn(data, index))}
        </div>
      </div>

      {/* Navegação */}
      {onMonthChange && (
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none z-30">
             <button 
                onClick={() => onMonthChange(getPreviousMonth(currentMonth))} 
                className="pointer-events-auto p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg text-muted-foreground hover:text-foreground hover:scale-110 transition-all opacity-0 md:opacity-100"
             >
                <CaretLeftIcon size={20} weight="bold" />
             </button>
             <button 
                onClick={() => onMonthChange(getNextMonth(currentMonth))} 
                className="pointer-events-auto p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg text-muted-foreground hover:text-foreground hover:scale-110 transition-all opacity-0 md:opacity-100"
             >
                <CaretRightIcon size={20} weight="bold" />
             </button>
        </div>
      )}

      {/* Navegação Mobile */}
      {onMonthChange && (
         <div className="flex md:hidden items-center justify-center gap-6 mt-8 pt-4 border-t border-border/50 relative z-20">
            <button onClick={() => onMonthChange(getPreviousMonth(currentMonth))} className="p-3 rounded-xl bg-muted/50 hover:bg-muted text-foreground transition-colors">
                <CaretLeftIcon size={20} />
            </button>
            <span className="text-sm font-medium text-muted-foreground">Navegar</span>
            <button onClick={() => onMonthChange(getNextMonth(currentMonth))} className="p-3 rounded-xl bg-muted/50 hover:bg-muted text-foreground transition-colors">
                <CaretRightIcon size={20} />
            </button>
         </div>
      )}
    </div>
  )
}