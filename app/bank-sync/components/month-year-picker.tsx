"use client"

import { useState } from "react"
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
const MONTH_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
]

function parseValue(value: string): { year: number; month: number } | null {
  if (!value) return null
  const [y, m] = value.split("-").map(Number)
  if (!y || !m) return null
  return { year: y, month: m - 1 }
}

function formatValue(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`
}

interface MonthYearPickerProps {
  value: string // "YYYY-MM" ou ""
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  /** Impede escolher meses no futuro — faz sentido pra corte de sincronização, que só existe pra dados que já aconteceram. */
  disableFuture?: boolean
}

export function MonthYearPicker({ value, onChange, placeholder = "Escolher mês", disabled, className, disableFuture = true }: MonthYearPickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseValue(value)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [viewYear, setViewYear] = useState(selected?.year ?? currentYear)

  const isFuture = (year: number, monthIndex: number) => disableFuture && (year > currentYear || (year === currentYear && monthIndex > currentMonth))
  const nextYearDisabled = disableFuture && viewYear >= currentYear

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setViewYear(selected?.year ?? currentYear)
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border text-sm text-foreground hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 transition-colors",
            className,
          )}
        >
          <CalendarBlank size={14} weight="bold" className="text-muted-foreground shrink-0" />
          <span className={cn("flex-1 text-left truncate", !selected && "text-muted-foreground")}>
            {selected ? `${MONTH_FULL[selected.month]} de ${selected.year}` : placeholder}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 z-110" align="start">
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
            disabled={nextYearDisabled}
            onClick={() => setViewYear((y) => y + 1)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTH_ABBR.map((label, i) => {
            const isSelected = selected?.year === viewYear && selected?.month === i
            const disabledMonth = isFuture(viewYear, i)
            return (
              <button
                key={label}
                type="button"
                disabled={disabledMonth}
                onClick={() => {
                  onChange(formatValue(viewYear, i))
                  setOpen(false)
                }}
                className={cn(
                  "py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed",
                  isSelected ? "bg-primary text-background" : "text-foreground hover:bg-muted",
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("")
              setOpen(false)
            }}
            className="w-full mt-3 pt-2.5 border-t border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar seleção
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
