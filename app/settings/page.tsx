"use client"

import { useState, useEffect } from "react"
import { Moon, Sun, Warning, Trash } from "@phosphor-icons/react"
import * as PhosphorIcons from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { useTheme } from "@/hooks/use-theme"
import {
  getSettings,
  setSettings as saveSettings,
  getCategories,
  getTransactions,
  setTransactions
} from "@/lib/storage"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/date-utils"
import { getCurrentUser, updateCurrentUser, type User } from "@/lib/auth"
import { User as UserIcon, Envelope } from "@phosphor-icons/react"
import { toast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme()
  const [spendingGoal, setSpendingGoal] = useState("")
  const [currency, setCurrency] = useState("BRL")
  const [categoryGoals, setCategoryGoals] = useState<any[]>([])
  const categories = getCategories().filter((c) => c.type === "expense")
  const [showClearDialog, setShowClearDialog] = useState(false)

  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    setUser(getCurrentUser())
  }, [])

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    if (user) {
      updateCurrentUser(user)
      toast({ title: "Perfil atualizado!", description: "Seus dados foram atualizados com sucesso.", variant: "success" })
    }
  }

  useEffect(() => {
    const settings = getSettings()
    setSpendingGoal(settings.spendingGoal.toString())
    setCurrency(settings.currency)
    setCategoryGoals(settings.categoryGoals || [])
  }, [])

  const handleSave = () => {
    saveSettings({
      spendingGoal: Number.parseFloat(spendingGoal),
      currency,
      categoryGoals,
    })
    toast({ title: "Configurações salvas!", description: "Suas configurações foram salvas com sucesso.", variant: "success" })
  }

  const confirmClearData = () => {
    setTransactions([]) // Zera o array de transações no storage
    toast({ title: "Dados apagados!", description: "Todos os dados foram apagados com sucesso.", variant: "destructive" })
    setShowClearDialog(false)
    window.location.reload()
  }

  const handlePercentageChange = (categoryId: string, value: number) => {
    const updated = categoryGoals.filter((g) => g.categoryId !== categoryId)
    if (value > 0) {
      updated.push({ categoryId, percentage: value })
    }
    setCategoryGoals(updated)
  }

  const totalPercentage = categoryGoals.reduce((sum, g) => sum + g.percentage, 0)

  const transactions = getTransactions()
  const warnings: string[] = []
  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthlyExpense = transactions
    .filter((t) => t.type === "expense" && t.date.startsWith(currentMonth))
    .reduce((sum, t) => sum + t.amount, 0)

  categoryGoals.forEach((goal) => {
    const categoryTotal = transactions
      .filter((t) => t.type === "expense" && t.categoryId === goal.categoryId && t.date.startsWith(currentMonth))
      .reduce((sum, t) => sum + t.amount, 0)

    const allowedAmount = (monthlyExpense * goal.percentage) / 100
    const category = categories.find((c) => c.id === goal.categoryId)

    if (categoryTotal > allowedAmount && category) {
      warnings.push(`${category.name}: Excedeu ${formatCurrency(categoryTotal - allowedAmount)}`)
    }
  })

  return (
    <AppLayout>
      <PageHeader title="Configurações" subtitle="Personalize seu aplicativo" />

      <div className="max-w-2xl mx-auto space-y-6 pb-10">

        {/* Personal Data */}
        <div className="rounded-[20px] bg-card p-6 border border-border/50">
          <h3 className="text-lg font-semibold text-foreground mb-4">Dados Pessoais</h3>
          {user ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="text"
                    value={user.name}
                    onChange={(e) => setUser({ ...user, name: e.target.value })}
                    className="w-full pl-10 px-4 py-2 rounded-xl bg-background border border-border"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <div className="relative">
                  <Envelope className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <input
                    type="email"
                    value={user.email}
                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                    className="w-full pl-10 px-4 py-2 rounded-xl bg-background border border-border"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-4 py-2 bg-primary text-background rounded-lg text-sm font-bold hover:opacity-90">
                  Salvar Perfil
                </button>
              </div>
            </form>
          ) : (
            <p className="text-muted-foreground">Usuário não identificado.</p>
          )}
        </div>

        {/* Theme Toggle */}
        <div className="rounded-[20px] bg-card p-6 border border-border/50">
          <h3 className="text-lg font-semibold text-foreground mb-4">Aparência</h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">Tema</p>
              <p className="text-sm text-muted-foreground">Escolha entre claro ou escuro</p>
            </div>

            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 px-4 py-2 rounded-[1vw] bg-background hover:bg-muted-foreground/20 transition-colors"
            >
              {theme === "dark" ? (
                <>
                  <Moon weight="fill" size={20} />
                  <span className="font-medium">Escuro</span>
                </>
              ) : (
                <>
                  <Sun weight="fill" size={20} />
                  <span className="font-medium">Claro</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Financial Settings */}
        <div className="rounded-[20px] bg-card p-6 border border-border/50">
          <h3 className="text-lg font-semibold text-foreground mb-4">Configurações Financeiras</h3>

          <div className="space-y-4">
            {/* Spending Goal */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Meta para limite Mensal de Gastos</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={spendingGoal}
                  onChange={(e) => setSpendingGoal(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Defina o limite ideal de gastos mensais</p>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Moeda</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="BRL">Real Brasileiro (BRL)</option>
                <option value="USD">Dólar Americano (USD)</option>
                <option value="EUR">Euro (EUR)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-[20px] bg-card p-6 border border-border/50">
          <h3 className="text-lg font-semibold text-foreground mb-2">Metas de Gasto por Categoria</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Defina percentuais para controlar seus gastos (total deve ser 100%)
          </p>

          {warnings.length > 0 && (
            <div className="mb-4 p-4 rounded-[1vw] bg-expense/10 border border-expense/20">
              <div className="flex items-start gap-2">
                <Warning size={20} weight="fill" className="text-expense mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-expense mb-1">Categorias Excedidas:</p>
                  {warnings.map((w, i) => (
                    <p key={i} className="text-sm text-expense">
                      • {w}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 mb-4">
            {categories.map((category) => {
              const goal = categoryGoals.find((g) => g.categoryId === category.id)
              const percentage = goal?.percentage || 0

              const IconComponent = (category.icon && PhosphorIcons[category.icon as keyof typeof PhosphorIcons]) || PhosphorIcons.Circle

              return (
                <div key={category.id} className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center bg-background"
                    style={{ color: category.color }}
                  >
                    {/* @ts-ignore */}
                    <IconComponent size={20} weight="fill" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{category.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={percentage}
                      onChange={(e) => handlePercentageChange(category.id, Number.parseInt(e.target.value) || 0)}
                      className="w-20 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-center focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-muted-foreground">%</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between p-4 rounded-[1vw] bg-background">
            <span className="font-semibold text-foreground">Total</span>
            <span
              className={cn(
                "text-xl font-bold",
                totalPercentage === 100 ? "text-income" : totalPercentage > 100 ? "text-expense" : "text-foreground",
              )}
            >
              {totalPercentage}%
            </span>
          </div>
          {totalPercentage !== 100 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {totalPercentage > 100 ? "Reduza" : "Aumente"} para atingir 100%
            </p>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full py-3 px-4 bg-primary text-background rounded-[1vw] font-semibold hover:bg-primary/90 transition-colors"
        >
          Salvar Configurações
        </button>

        {/* --- NOVO CARD: ZONA DE PERIGO --- */}
        <div className="rounded-[20px] bg-card p-6 border border-expense/30 mt-8">
          <div className="flex items-center gap-2 mb-4 text-expense">
            <Warning size={24} weight="fill" />
            <h3 className="text-lg font-semibold">Zona de Perigo</h3>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            Ações aqui são irreversíveis. Tenha certeza antes de prosseguir.
          </p>

          <button
            onClick={() => setShowClearDialog(true)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-transparent border-2 border-expense text-expense rounded-[1vw] font-semibold hover:bg-expense hover:text-white transition-all"
          >
            <Trash size={20} weight="bold" />
            Apagar Todas as Transações
          </button>
        </div>
      </div>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente prosseguir?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação apagará <strong>TODAS</strong> as suas transações e dados permanentemente. Isso não pode ser desfeito.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmClearData} className="bg-destructive hover:bg-destructive/90 text-white">
              Sim, apagar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  )
}