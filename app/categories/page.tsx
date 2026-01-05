"use client"

import { useState, useEffect } from "react"
import { Plus, Folders } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { CategoryItem } from "@/components/categories/category-item"
import { AddCategoryDialog } from "@/components/categories/add-category-dialog"
import { getCategories, getTransactions, setCategories, getSettings } from "@/lib/storage"
import type { Category } from "@/lib/types"

export default function CategoriesPage() {
  const [categories, setLocalCategories] = useState<Category[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [categoryStats, setCategoryStats] = useState<
    Record<string, { total: number; count: number; percentage: number }>
  >({})
  const [filter, setFilter] = useState<"all" | "income" | "expense">("all")

  const loadCategories = () => {
    const allCategories = getCategories()
    setLocalCategories(allCategories)

    const transactions = getTransactions()
    const settings = getSettings()
    const categoryGoals = settings.categoryGoals || []
    
    // 1. Define o mês atual (YYYY-MM) para filtrar
    const currentMonth = new Date().toISOString().slice(0, 7)

    // 2. Filtra transações APENAS do mês atual
    const monthlyTransactions = transactions.filter(t => t.date.startsWith(currentMonth))

    // 3. Pega o valor da Meta Global de Gastos (definida em Configurações)
    // Se não tiver meta definida, usamos o total gasto no mês como fallback para evitar divisão por zero
    const globalSpendingGoal = settings.spendingGoal || 0

    const stats: Record<string, { total: number; count: number; percentage: number }> = {}

    allCategories.forEach((category) => {
      // Filtra transações desta categoria NO MÊS ATUAL
      const categoryTransactions = monthlyTransactions.filter((t) => t.categoryId === category.id)
      
      // Soma o total gasto nesta categoria este mês
      const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)
      
      // Busca a % definida para esta categoria
      // Nota: categoryGoals é um array, precisamos achar o objeto certo
      const goalData = categoryGoals.find((g: any) => g.categoryId === category.id)
      const goalPercentValue = goalData?.percentage || 0

      // Cálculo da porcentagem de atingimento da meta
      let percentage = 0
      
      if (goalPercentValue > 0 && category.type === "expense") {
        // Quanto eu deveria gastar nessa categoria (em R$) com base na meta global?
        // Ex: Meta Global 5000 * 10% = R$ 500,00 permitidos para esta categoria
        const allowedAmount = (globalSpendingGoal * goalPercentValue) / 100

        if (allowedAmount > 0) {
          // Ex: Gastei 250 / Permitido 500 = 50%
          percentage = (total / allowedAmount) * 100
        } else if (total > 0) {
          // Se não tem meta global definida mas tem gasto e tem % configurada, consideramos 100% ou mais
          percentage = 100 
        }
      }

      stats[category.id] = {
        total,
        count: categoryTransactions.length, // Agora conta apenas as do mês atual
        percentage,
      }
    })

    setCategoryStats(stats)
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const handleDelete = (id: string) => {
    const transactions = getTransactions()
    const hasTransactions = transactions.some((t) => t.categoryId === id)

    if (hasTransactions) {
      alert("Não é possível excluir uma categoria que possui transações vinculadas.")
      return
    }

    if (confirm("Deseja excluir esta categoria?")) {
      const updated = categories.filter((c) => c.id !== id)
      setCategories(updated)
      loadCategories()
    }
  }

  const filteredCategories = categories.filter((c) => filter === "all" || c.type === filter)

  const incomeCategories = filteredCategories.filter((c) => c.type === "income")
  const expenseCategories = filteredCategories.filter((c) => c.type === "expense")

  return (
    <AppLayout>
      <PageHeader title="Categorias" subtitle="Gerencie suas categorias de receitas e despesas" />

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 p-1 bg-muted rounded-[1vw]">
        <button
          onClick={() => setFilter("all")}
          className={`flex-1 py-2 px-4 rounded-[1vw] font-medium transition-all ${
            filter === "all" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter("income")}
          className={`flex-1 py-2 px-4 rounded-[1vw] font-medium transition-all ${
            filter === "income" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Receitas
        </button>
        <button
          onClick={() => setFilter("expense")}
          className={`flex-1 py-2 px-4 rounded-[1vw] font-medium transition-all ${
            filter === "expense" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
          }`}
        >
          Despesas
        </button>
      </div>

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
                  onDelete={handleDelete}
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
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
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

      {/* FAB */}
      {filteredCategories.length > 0 && (
        <button
          onClick={() => setIsDialogOpen(true)}
          className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform md:bottom-6"
        >
          <Plus weight="bold" size={24} />
        </button>
      )}

      <AddCategoryDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} onSuccess={loadCategories} />
    </AppLayout>
  )
}