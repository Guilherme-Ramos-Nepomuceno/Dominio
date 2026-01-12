"use client"

import { useState, useEffect, useMemo } from "react"
import { CaretLeftIcon, CaretRightIcon, CircleNotchIcon, TrendUpIcon } from "@phosphor-icons/react"
import { getCategories, getSettings, getTransactions } from "@/lib/storage"
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
  color: string
  amount: number
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

  useEffect(() => {
    const settings = getSettings();
    const categories = getCategories();
    const allTransactions = getTransactions();

    setData({ settings, categories, allTransactions });

    const initialThreshold = customThreshold ?? settings.spendingGoal;
    setThresholdInput(initialThreshold.toString());
  }, [customThreshold]);

  const monthsToShow = useMemo(() => {
    const prev1 = getPreviousMonth(currentMonth)
    const prev2 = getPreviousMonth(prev1)
    const next1 = getNextMonth(currentMonth)
    const next2 = getNextMonth(next1)
    return [prev2, prev1, currentMonth, next1, next2]
  }, [currentMonth])

  if (!data) {
    return (
        <div className="rounded-[24px] bg-card p-8 shadow-sm border border-border/40 h-[450px] flex items-center justify-center">
            <CircleNotchIcon className="animate-spin text-muted-foreground" size={32} />
        </div>
    );
  }

  const { settings, categories, allTransactions } = data;
  const threshold = customThreshold ?? settings.spendingGoal

  const getMonthData = (month: string) => {
    const monthTransactions = allTransactions.filter((t) => t.date.startsWith(month))
    const result: CategoryData[] = []

    monthTransactions.forEach((transaction) => {
      const category = categories.find((c) => c.id === transaction.categoryId)
      if (category?.type !== "expense") return

      const existing = result.find((d) => d.categoryId === category.id)
      if (existing) {
        existing.amount += transaction.amount
      } else {
        result.push({
          categoryId: category.id,
          name: category.name,
          color: category.color,
          amount: transaction.amount,
        })
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

  const maxTotal = Math.max(...chartData.map(d => d.total), threshold)
  const maxValue = maxTotal > 0 ? maxTotal * 1.2 : 100

  const handleThresholdSave = () => {
    const newValue = Number.parseFloat(thresholdInput)
    if (!isNaN(newValue) && newValue > 0) {
      onThresholdChange?.(newValue)
    }
    setIsEditingThreshold(false)
  }

  const thresholdPercentage = (threshold / maxValue) * 100

  const renderColumn = (monthData: typeof chartData[0]) => {
    return (
      <div key={monthData.month} className="flex-1 flex flex-col items-center group/column">
        
        {/* Container da Coluna */}
        <div className="w-full h-64 relative flex items-end justify-center">
          
          {/* Barra Stacked (Container dos segmentos) */}
          <div className={cn(
            "w-12 sm:w-14 h-full flex flex-col-reverse justify-start relative z-10 transition-transform duration-300 group-hover/column:scale-[1.02]",
            // --- CORREÇÃO AQUI: Eleva o z-index da coluna inteira no hover ---
            "group-hover/column:z-[100]"
          )}>
            
            {monthData.categories.length === 0 ? (
               <div className="h-[4px] w-full bg-border/50 rounded-full mb-0" />
            ) : (
                monthData.categories.map((cat, index) => {
                const heightPercentage = (cat.amount / maxValue) * 100
                const isTop = index === monthData.categories.length - 1
                const isBottom = index === 0

                if (heightPercentage <= 0) return null;

                return (
                  <div
                    key={cat.categoryId}
                    className={cn(
                        "relative w-full transition-all duration-300 hover:brightness-110 group/segment",
                        // Eleva o segmento atual sobre os outros da mesma barra
                        "hover:z-20", 
                        isTop ? "rounded-t-[6px]" : "",
                        isBottom ? "rounded-b-[6px]" : "",
                        !isBottom ? "border-b-[2px] border-card" : ""
                    )}
                    style={{
                      backgroundColor: cat.color,
                      height: `${heightPercentage}%`,
                      opacity: monthData.isCurrent ? 1 : 0.6,
                    }}
                  >
                    {/* Tooltip */}
                    <div className="absolute left-1/2 -translate-x-1/2 bottom-[110%] opacity-0 group-hover/segment:opacity-100 transition-all duration-200 pointer-events-none z-50 transform group-hover/segment:translate-y-0 translate-y-2">
                        <div className="bg-[#1a1a1a]/95 backdrop-blur-md text-white border border-white/10 rounded-xl px-4 py-3 shadow-2xl min-w-[140px]">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                                <p className="text-xs font-medium text-gray-300 truncate max-w-[100px]">{cat.name}</p>
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
          </div>
        </div>

        {/* Labels e Totais */}
        <div className="mt-4 text-center space-y-1">
          <p className={cn(
              "text-xs font-bold uppercase tracking-wider transition-colors", 
              monthData.isCurrent ? "text-primary" : "text-muted-foreground/60"
            )}>
            {monthData.label}
          </p>
          <p className={cn(
              "text-sm font-bold transition-all",
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
    // Container principal com overflow-visible para o tooltip não ser cortado
    <div className="rounded-[24px] bg-card p-6 sm:p-8 shadow-sm border border-border/50 relative overflow-visible">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            Fluxo de Gastos
          </h3>
          <p className="text-sm text-muted-foreground mt-1">Comparativo de despesas (5 Meses)</p>
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
      <div className="relative mt-4">
        {/* Linha de Meta (Threshold) */}
        <div
          className="absolute left-0 right-0 z-0 pointer-events-none transition-all duration-500 ease-out"
          style={{ bottom: `calc(${thresholdPercentage}% + 3.5rem)` }}
        >
          <div className="border-t-2 border-dashed border-red-400/50 w-full relative">
             <div className="absolute right-0 -top-3 bg-red-400/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                Meta
             </div>
          </div>
        </div>

        {/* Colunas */}
        <div className="flex gap-2 sm:gap-6 items-end justify-between min-h-[300px]">
          {chartData.map(data => renderColumn(data))}
        </div>
      </div>

      {/* Navegação */}
      {onMonthChange && (
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none">
             <button 
                onClick={() => onMonthChange(getPreviousMonth(currentMonth))} 
                className="pointer-events-auto p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg text-muted-foreground hover:text-foreground hover:scale-110 transition-all opacity-0 md:opacity-100 z-50"
             >
                <CaretLeftIcon size={20} weight="bold" />
             </button>
             <button 
                onClick={() => onMonthChange(getNextMonth(currentMonth))} 
                className="pointer-events-auto p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border shadow-lg text-muted-foreground hover:text-foreground hover:scale-110 transition-all opacity-0 md:opacity-100 z-50"
             >
                <CaretRightIcon size={20} weight="bold" />
             </button>
        </div>
      )}

      {/* Navegação Mobile */}
      {onMonthChange && (
         <div className="flex md:hidden items-center justify-center gap-6 mt-8 pt-4 border-t border-border/50">
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