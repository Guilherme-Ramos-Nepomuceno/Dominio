"use client"

import { useState } from "react"
import { formatCurrency } from "@/lib/date-utils"

interface MiniBarChartProps {
  data: number[]
  color: string
  height?: number
}

export function MiniBarChart({ data, color, height = 40 }: MiniBarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const maxValue = Math.max(...data, 1)

  return (
    <div className="relative">
      {/* Tooltip */}
      {hoveredIndex !== null && data[hoveredIndex] > 0 && (
        <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none z-10">
          <div className="bg-foreground text-background px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg">
            {formatCurrency(data[hoveredIndex])}
          </div>
        </div>
      )}

      {/* Bars */}
      <div className="flex mt-[] mr-[] mb-0 border-0 py-0 items-end justify-start tracking-normal leading-7 gap-1" style={{ height: `${height}px` }}>
        <div className="flex items-center gap-1 mt-0.5"></div>
        {data.map((value, index) => {
          const barHeight = value > 0 ? (value / maxValue) * 100 : 0

          return (
            <div
              key={index}
              className="flex-1 rounded-t-sm transition-all duration-300 cursor-pointer hover:opacity-80"
              style={{
                backgroundColor: value > 0 ? color : "#e5e7eb",
                height: value > 0 ? `${barHeight}%` : "15%",
                minHeight: "2px",
              }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          )
        })}
      </div>
    </div>
  )
}
