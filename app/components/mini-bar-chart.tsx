"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

export interface ChartDataPoint {
  value: number
  label: string
  fullDate: string
  // YYYY-MM-DD (sv-SE) do dia que essa barra representa — usado pra filtrar
  // as transações desse dia ao clicar, sem depender de reparsear `fullDate`
  // (que é só texto formatado pra exibição, ex: "02 set").
  dateStr?: string
}

interface MiniBarChartProps {
  data?: ChartDataPoint[]
  color: string
  height?: number
  className?: string
  onBarClick?: (point: ChartDataPoint) => void
}

export function MiniBarChart({
  data = [],
  color,
  height = 100,
  className,
  onBarClick,
}: MiniBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  let safeData: ChartDataPoint[] = data
  if (!data || data.length === 0) {
     safeData = Array.from({ length: 7 }, () => ({ value: 0, label: "-", fullDate: "-" }))
  }
  
  const values = safeData.map(d => d.value)
  const maxValue = Math.max(...values, 1)

  const gapClass = safeData.length > 15 ? "gap-[1px]" : "gap-2"

  // Com muitas barras (visão mensal, até 31 dias) não cabe um label por barra
  // sem sobrepor os vizinhos. Mostra de 5 em 5 dias, mais o último dia do mês
  // (28/29/30/31, variável), e o dia da barra em hover/toque mesmo fora do passo.
  const manyBars = safeData.length > 15
  const shouldShowLabel = (index: number, item: ChartDataPoint, isHovered: boolean) => {
    if (!manyBars) return true
    if (isHovered) return true
    if (index === 0 || index === safeData.length - 1) return true
    const day = parseInt(item.label, 10)
    return !isNaN(day) && day % 5 === 0
  }

  return (
    <div
      className={cn("w-full select-none", className)}
      style={{ height: `${height}px` }}
    >
      <div className={cn("w-full h-full flex items-end", gapClass)}>
        
        {safeData.map((item, index) => {
          const barPercentage = (item.value / maxValue) * 100
          const isHovered = hoveredIndex === index

          return (
            <div
              key={index}
              className="flex-1 h-full flex flex-col justify-end group relative min-w-0"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              onClick={() => {
                setHoveredIndex(isHovered ? null : index)
                if (item.dateStr) onBarClick?.(item)
              }}
            >
              
              {/* ÁREA DA BARRA */}
              <div className="flex-1 w-full flex items-end justify-center relative z-10 mb-1.5">
                
                {/* --- TOOLTIP --- */}
                {isHovered && item.value > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
                     <div className="flex flex-col items-center animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                        
                        {/* Caixa do Tooltip: inverte o tema (escura no claro, clara no escuro) */}
                        <div className="text-background rounded-md px-2 py-1 shadow-xl flex items-center justify-center whitespace-nowrap bg-foreground">
                          <span className="text-[10px] font-bold tracking-tight">
                            {formatCurrency(item.value)}
                          </span>
                        </div>

                        {/* Triângulo (Seta) */}
                        <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-l-transparent border-r-transparent mt-[-1px] border-t-foreground"></div>
                     </div>
                  </div>
                )}

                {/* BARRA VISUAL: cor da série; dia vazio fica num toco neutro que aparece nos dois temas */}
                <div
                  className={cn(
                    "w-full rounded-t-[3px] transition-all duration-300 ease-out",
                    item.value > 0 ? "opacity-100" : "opacity-20",
                    isHovered && item.value > 0 ? "brightness-110" : ""
                  )}
                  style={{
                    height: `${Math.max(barPercentage, 4)}%`,
                    backgroundColor: item.value > 0 ? color : "var(--muted-foreground)",
                  }}
                />
              </div>

              {/* LABEL */}
              {/* Colunas mensais são estreitas demais (até 31 no mesmo espaço) para o
                  texto do label caber dentro da própria coluna sem cortar. Como só
                  algumas colunas mostram label por vez, deixamos o texto "vazar" para
                  as colunas vizinhas (vazias) via position absolute, ancorado nas
                  pontas para não sair da borda do card. */}
              <div className="h-[20px] w-full relative">
                 {shouldShowLabel(index, item, isHovered) && (
                   <span className={cn(
                      "absolute top-0 text-[8px] sm:text-[9px] text-muted-foreground font-semibold uppercase whitespace-nowrap transition-colors duration-200 tracking-tighter",
                      index === 0 ? "left-0" : index === safeData.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2",
                       isHovered ? "text-text-primary scale-105" : ""
                   )}>
                      {item.label}
                   </span>
                 )}
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}