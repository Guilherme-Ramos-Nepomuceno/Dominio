"use client"

import { MagnifyingGlass } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import { CategoryFilterPicker } from "./category-filter-picker"
import { CardFilterPicker } from "./card-filter-picker"
import { cn } from "@/lib/utils"
import type { Category, Card } from "@/lib/types"
import type { StatsFilters } from "../hooks/use-stats-view-model"

interface AnalyticsFilterBarProps {
    filters: StatsFilters
    onChange: (filters: StatsFilters) => void
    categories: Category[]
    cards: Card[]
    className?: string
}

function SegmentedControl<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T
    options: { value: T; label: string; icon?: React.ReactNode }[]
    onChange: (value: T) => void
}) {
    return (
        <div className="bg-muted/40 p-0.5 rounded-lg inline-flex">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors",
                        value === option.value
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    {option.icon}
                    {option.label}
                </button>
            ))}
        </div>
    )
}

export function AnalyticsFilterBar({ filters, onChange, categories, cards, className }: AnalyticsFilterBarProps) {
    const set = <K extends keyof StatsFilters>(key: K, value: StatsFilters[K]) => onChange({ ...filters, [key]: value })

    return (
        <div className={cn("space-y-3", className)}>
            <div className="relative">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Buscar por descrição ou categoria..."
                    className="pl-9"
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <CategoryFilterPicker categories={categories} value={filters.categoryId} onChange={(value) => set("categoryId", value)} />
                <CardFilterPicker cards={cards} value={filters.cardId} onChange={(value) => set("cardId", value)} />
            </div>

            <div className="flex items-center justify-between gap-2">
                <SegmentedControl
                    value={filters.paymentMethod}
                    onChange={(value) => set("paymentMethod", value)}
                    options={[
                        { value: "all", label: "Tudo" },
                        { value: "debit", label: "Débito" },
                        { value: "credit", label: "Crédito" },
                    ]}
                />

                <SegmentedControl
                    value={filters.status}
                    onChange={(value) => set("status", value)}
                    options={[
                        { value: "all", label: "Todos" },
                        { value: "open", label: "Aberto" },
                        { value: "paid", label: "Pago" },
                    ]}
                />
            </div>
        </div>
    )
}
