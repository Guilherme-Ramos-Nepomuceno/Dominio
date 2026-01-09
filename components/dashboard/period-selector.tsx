"use client"

import { useRef, useEffect, useState } from "react"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { formatShortMonth, getMonthRange, getCurrentMonth } from "@/lib/date-utils"

interface PeriodSelectorProps {
  selectedMonth: string
  onMonthChange: (month: string) => void
  className?: string
}

export function PeriodSelector({ selectedMonth, onMonthChange, className }: PeriodSelectorProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const currentMonth = getCurrentMonth()
  const months = getMonthRange(currentMonth, 12) // 12 months before and after

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
      setCanScrollLeft(scrollLeft > 0)
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }
  }

  useEffect(() => {
    checkScroll()
    const scrollElement = scrollRef.current
    if (scrollElement) {
      scrollElement.addEventListener("scroll", checkScroll)
      return () => scrollElement.removeEventListener("scroll", checkScroll)
    }
  }, [])

  useEffect(() => {
    // Auto-scroll to selected month on mount
    if (scrollRef.current) {
      const selectedElement = scrollRef.current.querySelector(`[data-month="${selectedMonth}"]`) as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" })
      }
    }
  }, [selectedMonth])

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }
  return (
    <div className={cn("relative", className)}>
      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Mês anterior"
        >
          <CaretLeft weight="bold" size={20} />
        </button>
      )}

      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-card border border-border shadow-lg flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Próximo mês"
        >
          <CaretRight weight="bold" size={20} />
        </button>
      )}

      {/* Scrollable month list */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-12 py-4 custom-scrollbar scroll-smooth"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {months.map((month) => {
          const isSelected = month === selectedMonth
          const isCurrent = month === currentMonth
          return (
            <button
              key={month}
              data-month={month}
              onClick={() => onMonthChange(month)}
              className={cn(
                "shrink-0 px-6 py-3 rounded-[1vw] font-semibold transition-all text-sm",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border",
              )}
            >
              <div className="text-center">
                <p className={cn("capitalize", isSelected ? "font-bold" : "font-medium")}>{formatShortMonth(month)}</p>
                {isCurrent && !isSelected && (
                  <div className="w-1 h-1 rounded-full bg-primary mx-auto mt-1" aria-label="Mês atual" />
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
