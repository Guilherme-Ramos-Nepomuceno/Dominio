"use client"

import { MagnifyingGlass, Wallet, CreditCard, Circle, CheckCircle } from "@phosphor-icons/react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
        <div className="bg-card p-1 rounded-xl border border-border inline-flex shadow-sm">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange(option.value)}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                        value === option.value
                            ? "bg-foreground text-background shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
        <div className={cn("bg-card border border-border rounded-2xl p-4 space-y-4", className)}>
            <div className="relative">
                <MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                    value={filters.search}
                    onChange={(e) => set("search", e.target.value)}
                    placeholder="Buscar por descrição ou categoria..."
                    className="pl-9"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select value={filters.categoryId} onValueChange={(value) => set("categoryId", value)}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                                {category.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={filters.cardId} onValueChange={(value) => set("cardId", value)}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="Cartão" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os cartões</SelectItem>
                        {cards.map((card) => (
                            <SelectItem key={card.id} value={card.id}>
                                {card.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SegmentedControl
                    value={filters.paymentMethod}
                    onChange={(value) => set("paymentMethod", value)}
                    options={[
                        { value: "all", label: "Débito e crédito" },
                        { value: "debit", label: "Débito", icon: <Wallet size={14} /> },
                        { value: "credit", label: "Crédito", icon: <CreditCard size={14} /> },
                    ]}
                />

                <SegmentedControl
                    value={filters.status}
                    onChange={(value) => set("status", value)}
                    options={[
                        { value: "all", label: "Todos" },
                        { value: "open", label: "Aberto", icon: <Circle size={12} weight="fill" /> },
                        { value: "paid", label: "Pago", icon: <CheckCircle size={14} weight="fill" /> },
                    ]}
                />
            </div>
        </div>
    )
}
