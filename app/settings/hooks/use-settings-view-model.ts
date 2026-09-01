"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useTheme } from "@/hooks/use-theme"
import {
    getSettings,
    setSettings as saveSettings,
    getCategories,
    getTransactions,
    deleteAllTransactions,
} from "@/lib/storage"
import type { Category, Transaction } from "@/lib/types"
import { getCurrentUser, updateCurrentUser, type User } from "@/lib/auth"
import { toast } from "@/hooks/use-toast"
import { useAccount } from "@/components/account/account-context"
import { createFamilyInvite, createCoupleAccount as createCoupleAccountApi } from "@/lib/family"

export function useSettingsViewModel() {
    const { theme, toggleTheme } = useTheme()
    const { family, refreshFamily } = useAccount()
    const [spendingGoal, setSpendingGoal] = useState("")
    const [currency, setCurrency] = useState("BRL")
    const [categoryGoals, setCategoryGoals] = useState<any[]>([])
    const [showClearDialog, setShowClearDialog] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setUser(getCurrentUser())

        Promise.all([getSettings(), getCategories(), getTransactions()])
            .then(([settings, allCategories, allTransactions]) => {
                setSpendingGoal(settings.spendingGoal.toString())
                setCurrency(settings.currency)
                setCategoryGoals(settings.categoryGoals || [])
                setCategories(allCategories.filter((c) => c.type === "expense"))
                setTransactions(allTransactions)
            })
            .finally(() => setLoading(false))
    }, [])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (user) {
            await updateCurrentUser(user)
            toast({ title: "Perfil atualizado!", description: "Seus dados foram atualizados com sucesso.", variant: "success" })
        }
    }

    const handleSave = async () => {
        await saveSettings({
            spendingGoal: Number.parseFloat(spendingGoal),
            currency,
            categoryGoals,
        })
        toast({ title: "Configurações salvas!", description: "Suas configurações foram salvas com sucesso.", variant: "success" })
    }

    const confirmClearData = async () => {
        await deleteAllTransactions()
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

    const [invitingFamily, setInvitingFamily] = useState(false)
    const [inviteLink, setInviteLink] = useState("")
    const [creatingCoupleAccount, setCreatingCoupleAccount] = useState(false)

    const handleCreateInvite = async () => {
        setInvitingFamily(true)
        try {
            const invite = await createFamilyInvite()
            const link = `${window.location.origin}/join/${invite.token}`
            setInviteLink(link)
            await navigator.clipboard.writeText(link).catch(() => { })
            toast({
                title: "Link de convite criado!",
                description: "O link foi copiado para a área de transferência.",
                variant: "success",
            })
            await refreshFamily()
        } catch (error: any) {
            toast({
                title: "Não foi possível criar o convite",
                description: error.message || "Tente novamente em instantes.",
                variant: "destructive",
            })
        } finally {
            setInvitingFamily(false)
        }
    }

    const handleCreateCoupleAccount = async () => {
        setCreatingCoupleAccount(true)
        try {
            await createCoupleAccountApi()
            toast({
                title: "Conta do casal criada!",
                description: "Agora vocês podem trocar para ela pelo seletor de contas.",
                variant: "success",
            })
            await refreshFamily()
        } catch (error: any) {
            toast({
                title: "Não foi possível criar a conta do casal",
                description: error.message || "Tente novamente em instantes.",
                variant: "destructive",
            })
        } finally {
            setCreatingCoupleAccount(false)
        }
    }

    return {
        theme,
        toggleTheme,
        family,
        invitingFamily,
        inviteLink,
        handleCreateInvite,
        creatingCoupleAccount,
        handleCreateCoupleAccount,
        loading,
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
    }
}
