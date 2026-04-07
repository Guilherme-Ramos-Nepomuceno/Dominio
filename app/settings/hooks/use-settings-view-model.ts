"use client"

import { useState, useEffect, useMemo } from "react"
import { useTheme } from "@/hooks/use-theme"
import {
    getSettings,
    setSettings as saveSettings,
    getCategories,
    getTransactions,
    setTransactions
} from "@/lib/storage"
import { getCurrentUser, updateCurrentUser, type User } from "@/lib/auth"
import { toast } from "@/hooks/use-toast"

export function useSettingsViewModel() {
    const { theme, toggleTheme } = useTheme()
    const [spendingGoal, setSpendingGoal] = useState("")
    const [currency, setCurrency] = useState("BRL")
    const [categoryGoals, setCategoryGoals] = useState<any[]>([])
    const [showClearDialog, setShowClearDialog] = useState(false)
    const [user, setUser] = useState<User | null>(null)

    const categories = useMemo(() => getCategories().filter((c) => c.type === "expense"), [])
    const transactions = useMemo(() => getTransactions(), [])

    useEffect(() => {
        setUser(getCurrentUser())
        const settings = getSettings()
        setSpendingGoal(settings.spendingGoal.toString())
        setCurrency(settings.currency)
        setCategoryGoals(settings.categoryGoals || [])
    }, [])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (user) {
            await updateCurrentUser(user)
            toast({ title: "Perfil atualizado!", description: "Seus dados foram atualizados com sucesso.", variant: "success" })
        }
    }

    const handleSave = () => {
        saveSettings({
            spendingGoal: Number.parseFloat(spendingGoal),
            currency,
            categoryGoals,
        })
        toast({ title: "Configurações salvas!", description: "Suas configurações foram salvas com sucesso.", variant: "success" })
    }

    const confirmClearData = () => {
        setTransactions([])
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

    const totalPercentage = useMemo(() => categoryGoals.reduce((sum, g) => sum + g.percentage, 0), [categoryGoals])

    const warnings = useMemo(() => {
        const warns: string[] = []
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
                warns.push(`${category.name}: Excedeu ${(categoryTotal - allowedAmount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`)
            }
        })
        return warns
    }, [transactions, categoryGoals, categories])

    const [syncing, setSyncing] = useState(false)

    const handleFullSync = async () => {
        const { syncFullLocalStorageToBackend } = await import("@/lib/sync")

        setSyncing(true)
        try {
            const result = await syncFullLocalStorageToBackend()
            if (result.success) {
                toast({
                    title: "Sincronização concluída!",
                    description: `${result.count} itens foram enviados para o servidor.`,
                    variant: "success"
                })
            } else {
                toast({
                    title: "Nada para sincronizar",
                    description: result.message || "Seus dados já parecem estar em dia.",
                    variant: "default"
                })
            }
        } catch (error: any) {
            toast({
                title: "Falha na sincronização",
                description: error.message || "Ocorreu um erro ao enviar os dados.",
                variant: "destructive"
            })
        } finally {
            setSyncing(false)
        }
    }

    return {
        theme,
        toggleTheme,
        spendingGoal,
        setSpendingGoal,
        currency,
        setCurrency,
        categoryGoals,
        categories,
        showClearDialog,
        setShowClearDialog,
        user,
        setUser,
        handleUpdateProfile,
        handleSave,
        confirmClearData,
        handlePercentageChange,
        totalPercentage,
        warnings,
        handleFullSync,
        syncing
    }
}

