"use client"

import { cn } from "@/lib/utils"

interface SegmentedTabsProps<T extends string> {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  label: string
  className?: string
}

// Alternador de visões da mesma tela (ex.: Reservas e Tudo investido). Para
// trocar de tela de verdade, use PageSwitch (links).
export function SegmentedTabs<T extends string>({ tabs, value, onChange, label, className }: SegmentedTabsProps<T>) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex w-fit rounded-full border border-border p-0.5", className)}>
      {tabs.map((tab) => {
        const active = tab.id === value
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
