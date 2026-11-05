"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Folders, Tag, CaretRight } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { UNCATEGORIZED_LABEL } from "@/lib/category-utils"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { MonthHeaderSelector } from "@/components/ui/month-header-selector"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { CategoryItem } from "./category-item"
import { AddCategoryDialog } from "./add-category-dialog"
import { EditCategoryDialog } from "./edit-category-dialog"
import { CategoryHistoryDialog } from "./category-history-dialog"
import { SkeletonRowList } from "@/components/ui/loading-skeletons"
import { cn } from "@/lib/utils"
import type { Category } from "@/lib/types"
import { useCategoriesViewModel } from "../hooks/use-categories-view-model"
import { useCategoryGroups } from "@/hooks/use-category-groups"
import { groupColor, groupOfCategory, UNCATEGORIZED_COLOR } from "@/lib/plan-layout"

const FILTERS = [
    { value: "all", label: "Tudo" },
    { value: "expense", label: "Despesas" },
    { value: "income", label: "Receitas" },
] as const

// Categorias no desenho das telas novas: despesas por grupo do plano (a cor do
// grupo no ícone e na barra), receitas no fim, sem cartão em volta de cada
// uma. Criar é o "+" central do menu.
export function CategoriesView() {
    const {
        isDialogOpen,
        setIsDialogOpen,
        editingCategory,
        setEditingCategory,
        filter,
        setFilter,
        categoryStats,
        uncategorizedStats,
        planned,
        loadCategories,
        handleDelete,
        handleSaveEdit,
        filteredCategories,
        incomeCategories,
        expenseCategories,
        loading,
    } = useCategoriesViewModel()

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
    const groups = useCategoryGroups()

    // Despesas separadas pelo grupo do plano (na ordem dos grupos); fora dos grupos no fim.
    const expenseSections = useMemo(() => {
        const sections = groups
            .map((g) => ({
                key: g.id,
                title: g.name,
                color: groupColor(g.kind),
                items: expenseCategories.filter((c) => groupOfCategory(groups, c.id)?.id === g.id),
            }))
            .filter((s) => s.items.length > 0)
        const outside = expenseCategories.filter((c) => !groupOfCategory(groups, c.id))
        if (outside.length > 0) sections.push({ key: "outside", title: groups.length ? "Fora dos grupos" : "Despesas", color: UNCATEGORIZED_COLOR, items: outside })
        return sections
    }, [groups, expenseCategories])

    const renderList = (items: Category[], color: string) => (
        <ul className="mt-2 divide-y divide-border">
            {items.map((category) => (
                <li key={category.id}>
                    <CategoryItem
                        category={category}
                        color={color}
                        totalAmount={categoryStats[category.id]?.total || 0}
                        transactionCount={categoryStats[category.id]?.count || 0}
                        planned={planned[category.id] ?? null}
                        onDelete={handleDelete}
                        onEdit={setEditingCategory}
                        onClick={setSelectedCategory}
                    />
                </li>
            ))}
        </ul>
    )

    return (
        <AppLayout showMonthFilter primaryAction={{ label: "Nova categoria", onPress: () => setIsDialogOpen(true) }}>
            <div className="max-w-2xl mx-auto space-y-10 pb-24 md:pb-10">
                <PageHeader back="/all-menus"
                    title="Categorias"
                    subtitle="Quanto foi para cada uma no mês"
                    action={
                        <div className="hidden md:block">
                            <MonthHeaderSelector />
                        </div>
                    }
                />

                <div className="flex items-center justify-between gap-3 -mt-4">
                    <div role="radiogroup" aria-label="Tipo" className="inline-flex rounded-lg bg-muted/40 p-0.5">
                        {FILTERS.map((f) => (
                            <button
                                key={f.value}
                                type="button"
                                role="radio"
                                aria-checked={filter === f.value}
                                onClick={() => setFilter(f.value)}
                                className={cn(
                                    "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                                    filter === f.value ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <Link href="/rules" className="group flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
                        Regras
                        <CaretRight size={12} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                </div>

                {loading ? (
                    <SkeletonRowList count={5} />
                ) : (
                    <>
                        {(filter === "all" || filter === "expense") &&
                            expenseSections.map((section) => (
                                <section key={section.key} aria-labelledby={`cat-${section.key}`}>
                                    <SectionTitle id={`cat-${section.key}`} className="flex items-center gap-1.5">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: section.color }} aria-hidden />
                                        {section.title}
                                    </SectionTitle>
                                    {renderList(section.items, section.color)}
                                </section>
                            ))}

                        {/* "Sem categoria" do mês — leva para a caixa de entrada "A classificar". */}
                        {(filter === "all" || filter === "expense") && uncategorizedStats.count > 0 && (
                            <Link href="/inbox" className="group -mt-4 flex items-center gap-3 border-y border-dashed border-border py-3">
                                <Tag size={20} weight="duotone" className="shrink-0 text-muted-foreground" />
                                <span className="flex-1 min-w-0">
                                    <span className="block text-sm font-medium text-muted-foreground">{UNCATEGORIZED_LABEL}</span>
                                    <span className="block text-xs text-muted-foreground">
                                        {uncategorizedStats.count} {uncategorizedStats.count === 1 ? "transação" : "transações"} · classificar
                                    </span>
                                </span>
                                <span className="text-sm font-semibold tabular-nums text-muted-foreground">{formatCurrency(uncategorizedStats.total)}</span>
                                <CaretRight size={12} weight="bold" className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                            </Link>
                        )}

                        {(filter === "all" || filter === "income") && incomeCategories.length > 0 && (
                            <section aria-labelledby="cat-income">
                                <SectionTitle id="cat-income">Receitas</SectionTitle>
                                {renderList(incomeCategories, "var(--income)")}
                            </section>
                        )}

                        {filteredCategories.length === 0 && (
                            <div className="py-12 text-center">
                                <Folders size={40} className="mx-auto mb-3 text-muted-foreground" weight="duotone" />
                                <p className="text-sm text-muted-foreground">Nenhuma categoria por aqui. Toque no + para criar.</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <AddCategoryDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSuccess={loadCategories} />
            <EditCategoryDialog
                key={editingCategory?.id ?? "none"}
                category={editingCategory}
                onSave={handleSaveEdit}
                onClose={() => setEditingCategory(null)}
            />
            <CategoryHistoryDialog category={selectedCategory} onClose={() => setSelectedCategory(null)} />
        </AppLayout>
    )
}
