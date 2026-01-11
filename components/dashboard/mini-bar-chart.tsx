"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

export interface ChartDataPoint {
  value: number
  label: string
  fullDate: string
}

interface MiniBarChartProps {
  data?: ChartDataPoint[]
  color: string
  height?: number
  className?: string
}

export function MiniBarChart({
  data = [],
  color,
  height = 100,
  className
}: MiniBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  let safeData: ChartDataPoint[] = data
  if (!data || data.length === 0) {
     safeData = Array.from({ length: 7 }, () => ({ value: 0, label: "-", fullDate: "-" }))
  }
  
  const values = safeData.map(d => d.value)
  const maxValue = Math.max(...values, 1)

  // Gap mais apertado (1px) se for muitos dados (mensal) para caber os números
  const gapClass = safeData.length > 15 ? "gap-[4px]" : "gap-2"

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
            >
              
              {/* ÁREA DA BARRA */}
              <div className="flex-1 w-full flex items-end justify-center relative z-10 mb-1.5">
                
                {/* TOOLTIP */}
                {isHovered && item.value > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                     <div className="flex flex-col items-center animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200">
                        <div className="bg-[#111111] text-white rounded-md px-3 py-2 shadow-2xl border border-white/10 flex flex-col items-center whitespace-nowrap">
                          <span className="text-[9px] text-neutral-400 font-medium tracking-wide uppercase mb-0.5">
                            {item.fullDate}
                          </span>
                          <span className="text-xs font-bold tracking-tight">
                            {formatCurrency(item.value)}
                          </span>
                        </div>
                        <div className="w-0 h-0 border-l-[5px] border-r-[5px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#111] mt-[-1px]"></div>
                     </div>
                  </div>
                )}

                {/* BARRA VISUAL */}
                <div
                  className={cn(
                    "w-full rounded-t-[3px] transition-all duration-300 ease-out",
                    item.value > 0 ? "opacity-100" : "opacity-20",
                    isHovered && item.value > 0 ? "brightness-125 shadow-[0_0_10px_rgba(255,255,255,0.3)]" : ""
                  )}
                  style={{
                    height: `${Math.max(barPercentage, 4)}%`,
                    backgroundColor: item.value > 0 ? color : "rgba(255,255,255,0.1)",
                  }}
                />
              </div>

              {/* ÁREA DO LABEL - Atualizada */}
              <div className="h-[20px] w-full flex items-start justify-center overflow-visible">
                 <span className={cn(
                    // Removido 'truncate'.
                    // Adicionado tracking-tighter (letras mais juntas) para caber "30" dias
                    // Fonte reduzida para 8px em telas normais para não encavalar
                    "text-[8px] sm:text-[9px] text-neutral-600 font-semibold uppercase w-full text-center transition-colors duration-200 tracking-tighter",
                     isHovered ? "text-white scale-105" : ""
                 )}>
                    {item.label}
                 </span>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}