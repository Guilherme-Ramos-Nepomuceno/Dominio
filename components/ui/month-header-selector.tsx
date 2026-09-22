"use client"

import { useState } from "react"
import { CaretDown, CaretLeft, CaretRight } from "@phosphor-icons/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useSelectedMonth } from "@/lib/selected-month-context"

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const MONTH_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

interface MonthHeaderSelectorProps {
  className?: string
}

// Seletor de mês compacto ("Julho ⌄") usado no cabeçalho de Home, Stats,
// Categoria e Fatura — lê e escreve direto no contexto global de mês, então
// trocar aqui reflete nas outras telas sem precisar passar props.
export function MonthHeaderSelector({ className }: MonthHeaderSelectorProps) {
  const { selectedMonth, setSelectedMonth } = useSelectedMonth()
  const [open, setOpen] = useState(false)

  const [year, month] = selectedMonth.split("-").map(Number)
  const monthIndex = month - 1
  const currentYear = new Date().getFullYear()

  const [viewYear, setViewYear] = useState(year)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setViewYear(year)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 text-sm font-semibold text-foreground hover:opacity-70 transition-opacity",
            className,
          )}
        >
          <span className="capitalize">
            {MONTH_FULL[monthIndex]}
            {year !== currentYear && ` de ${year}`}
          </span>
          <CaretDown size={14} weight="bold" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 z-110" align="end">
        <div className="flex items-center justify-between mb-3">
          <button
            type="button"
            onClick={() => setViewYear((y) => y - 1)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <CaretLeft size={14} weight="bold" />
          </button>
          <p className="text-sm font-semibold text-foreground">{viewYear}</p>
          <button
            type="button"
            onClick={() => setViewYear((y) => y + 1)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_ABBR.map((label, i) => {
            const isSelected = year === viewYear && monthIndex === i
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setSelectedMonth(`${viewYear}-${String(i + 1).padStart(2, "0")}`)
                  setOpen(false)
                }}
                className={cn(
                  "py-1.5 rounded-lg text-xs font-medium transition-colors",
                  isSelected ? "bg-primary text-background" : "text-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
