"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Folders, Tag, CaretRight } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { UNCATEGORIZED_LABEL } from "@/lib/category-utils"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { MonthHeaderSelector } from "@/components/ui/month-header-selector"
import { CategoryItem } from "./category-item"
import { AddCategoryDialog } from "./add-category-dialog"
import { EditCategoryDialog } from "./edit-category-dialog"
import { CategoryHistoryDialog } from "./category-history-dialog"
import { SkeletonRowList } from "@/components/ui/loading-skeletons"
import { cn } from "@/lib/utils"
import type { Category } from "@/lib/types"
import { useCategoriesViewModel } from "../hooks/use-categories-view-model"

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
        categoryGoals,
        loadCategories,
        handleDelete,
        handleSaveEdit,
        filteredCategories,
        incomeCategories,
        expenseCategories,
        loading,
    } = useCategoriesViewModel()

    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

    return (
        <AppLayout showMonthFilter>
            <PageHeader
                title="Categorias"
                subtitle="Gerencie suas categorias de receitas e despesas"
                action={
                    <div className="hidden md:block">
                        <MonthHeaderSelector />
                    </div>
                }
            />

            {/* Filter Tabs */}
            <div className="flex justify-center mb-6">
                <div className="relative grid grid-cols-3 bg-card p-1 rounded-lg border border-white/5 w-full max-w-75">

                    {/* Sliding Background (Pill) */}
                    <div
                        className={cn(
                            "absolute top-1 bottom-1 left-1 bg-foreground rounded-md shadow-sm transition-transform duration-300 ease-in-out",
                            "w-[calc((100%-8px)/3)]",
                            filter === "all" && "translate-x-0",
                            filter === "income" && "translate-x-full",
                            filter === "expense" && "translate-x-[200%]"
                        )}
                    />

                    <button
                        onClick={() => setFilter("all")}
                        className={cn(
                            "relative z-10 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center transition-colors duration-200",
                            filter === "all" ? "text-background" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        Todas
                    </button>

                    <button
                        onClick={() => setFilter("income")}
                        className={cn(
                            "relative z-10 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center transition-colors duration-200",
                            filter === "income" ? "text-background" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        Receitas
                    </button>

                    <button
                        onClick={() => setFilter("expense")}
                        className={cn(
                            "relative z-10 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-center transition-colors duration-200",
                            filter === "expense" ? "text-background" : "text-neutral-500 hover:text-neutral-300"
                        )}
                    >
                        Despesas
                    </button>
                </div>
            </div>

            {loading ? (
                <SkeletonRowList count={5} />
            ) : (
            <div className="space-y-6">
                {/* Income Categories */}
                {(filter === "all" || filter === "income") && incomeCategories.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Receitas</h3>
                        <div className="space-y-2">
                            {incomeCategories.map((category) => (
                                <CategoryItem
                                    key={category.id}
                                    category={category}
                                    totalAmount={categoryStats[category.id]?.total || 0}
                                    transactionCount={categoryStats[category.id]?.count || 0}
                                    percentage={categoryStats[category.id]?.percentage || 0}
                                    categoryGoals={categoryGoals}
                                    onDelete={handleDelete}
                                    onEdit={setEditingCategory}
                                    onClick={setSelectedCategory}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Expense Categories */}
                {(filter === "all" || filter === "expense") && expenseCategories.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Despesas</h3>
                        <div className="space-y-2">
                            {expenseCategories.map((category) => (
                                <CategoryItem
                                    key={category.id}
                                    category={category}
                                    totalAmount={categoryStats[category.id]?.total || 0}
                                    transactionCount={categoryStats[category.id]?.count || 0}
                                    percentage={categoryStats[category.id]?.percentage || 0}
                                    categoryGoals={categoryGoals}
                                    onDelete={handleDelete}
                                    onEdit={setEditingCategory}
                                    onClick={setSelectedCategory}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* "Sem categoria" do mês — leva para a caixa de entrada "A classificar". */}
                {uncategorizedStats.count > 0 && (
                    <Link
                        href="/inbox"
                        className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-dashed border-border hover:border-primary/50 transition-colors"
                    >
                        <div className="w-12 h-12 flex items-center justify-center shrink-0 text-muted-foreground opacity-70">
                            <Tag size={26} weight="duotone" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-muted-foreground">{UNCATEGORIZED_LABEL}</h3>
                            <p className="text-sm text-muted-foreground">
                                {uncategorizedStats.count} {uncategorizedStats.count === 1 ? "transação" : "transações"} · ir para A classificar
                            </p>
                        </div>
                        <p className="font-bold text-muted-foreground tabular-nums">{formatCurrency(uncategorizedStats.total)}</p>
                        <CaretRight size={16} weight="bold" className="text-muted-foreground shrink-0" />
                    </Link>
                )}

                {filteredCategories.length === 0 && (
                    <div className="text-center py-12">
                        <Folders size={48} className="mx-auto text-muted-foreground mb-4" weight="duotone" />
                        <p className="text-muted-foreground mb-4">Nenhuma categoria encontrada</p>
                        <button
                            onClick={() => setIsDialogOpen(true)}
                            className="px-6 py-3 rounded-[1vw] bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                        >
                            Criar Primeira Categoria
                        </button>
                    </div>
                )}
            </div>
            )}

            {/* FAB */}
            {!loading && filteredCategories.length > 0 && (
                <button
                    onClick={() => setIsDialogOpen(true)}
                    className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform md:bottom-6"
                >
                    <Plus weight="bold" size={24} />
                </button>
            )}

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
