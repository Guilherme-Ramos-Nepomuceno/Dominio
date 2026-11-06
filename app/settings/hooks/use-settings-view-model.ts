"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "@/hooks/use-theme"
import {
    getSettings,
    setSettings as saveSettings,
    getCategories,
    getTransactions,
    deleteAllTransactions,
} from "@/lib/storage"
import type { Category, Transaction } from "@/lib/types"
import { getCurrentUser, updateCurrentUser, logoutUser, type User } from "@/lib/auth"
import { toast } from "@/hooks/use-toast"
import { useAccount } from "@/components/account/account-context"
import { createFamilyInvite, createCoupleAccount as createCoupleAccountApi } from "@/lib/family"
import { getAdminMe } from "@/lib/admin"

export function useSettingsViewModel() {
    const router = useRouter()
    const { theme, toggleTheme } = useTheme()
    const { family, refreshFamily } = useAccount()
    const [spendingGoal, setSpendingGoal] = useState("")
    const [currency, setCurrency] = useState("BRL")
    // Dia em que o mês do plano começa (1–31) — ver lib/period.ts.
    const [monthStartDay, setMonthStartDay] = useState(1)
    // Para onde vai a sobra/excesso de cada semana.
    const [weekCarryOver, setWeekCarryOver] = useState<"MONTH" | "WEEK">("MONTH")
    // Pluggy sem revisão — salva na hora, sem passar pelo "Salvar preferências".
    const [pluggyDirectSync, setPluggyDirectSync] = useState(false)
    const [savingDirectSync, setSavingDirectSync] = useState(false)
    const [categoryGoals, setCategoryGoals] = useState<any[]>([])
    const [showClearDialog, setShowClearDialog] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [categories, setCategories] = useState<Category[]>([])
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    // Link do painel admin só aparece para quem é admin (GET /admin/me).
    const [isAdmin, setIsAdmin] = useState(false)
    useEffect(() => {
        let cancelled = false
        getAdminMe().then((ok) => !cancelled && setIsAdmin(ok))
        return () => {
            cancelled = true
        }
    }, [])
    const [updatingProfile, setUpdatingProfile] = useState(false)
    const [savingSettings, setSavingSettings] = useState(false)
    const [clearingData, setClearingData] = useState(false)

    useEffect(() => {
        setUser(getCurrentUser())

        Promise.all([getSettings(), getCategories(), getTransactions()])
            .then(([settings, allCategories, allTransactions]) => {
                setSpendingGoal(settings.spendingGoal.toString())
                setCurrency(settings.currency)
                setMonthStartDay(settings.monthStartDay ?? 1)
                setWeekCarryOver(settings.weekCarryOver ?? "MONTH")
                setPluggyDirectSync(settings.pluggyDirectSync ?? false)
                setCategoryGoals(settings.categoryGoals || [])
                setCategories(allCategories.filter((c) => c.type === "expense"))
                setTransactions(allTransactions)
            })
            .finally(() => setLoading(false))
    }, [])

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (updatingProfile) return
        if (user) {
            setUpdatingProfile(true)
            try {
                await updateCurrentUser(user)
                toast({ title: "Perfil atualizado!", description: "Seus dados foram atualizados com sucesso.", variant: "success" })
            } finally {
                setUpdatingProfile(false)
            }
        }
    }

    const handleSave = async () => {
        if (savingSettings) return
        setSavingSettings(true)
        try {
            await saveSettings({
                spendingGoal: Number.parseFloat(spendingGoal),
                currency,
                categoryGoals,
                monthStartDay,
                weekCarryOver,
            })
            toast({ title: "Configurações salvas!", description: "Suas configurações foram salvas com sucesso.", variant: "success" })
        } finally {
            setSavingSettings(false)
        }
    }

    const handleDirectSyncChange = async (enabled: boolean) => {
        if (savingDirectSync) return
        setSavingDirectSync(true)
        setPluggyDirectSync(enabled)
        try {
            await saveSettings({ pluggyDirectSync: enabled })
            toast({
                title: enabled ? "Sincronização direta ligada" : "Sincronização direta desligada",
                description: enabled
                    ? "O que chegar do banco entra sozinho na próxima sincronização."
                    : "O que chegar do banco volta a passar pela revisão.",
                variant: "success",
            })
        } catch {
            setPluggyDirectSync(!enabled)
            toast({ title: "Não foi possível salvar", description: "Tente de novo em instantes.", variant: "destructive" })
        } finally {
            setSavingDirectSync(false)
        }
    }

    const handleLogout = () => {
        logoutUser()
        router.push("/login")
    }

    const confirmClearData = async () => {
        if (clearingData) return
        setClearingData(true)
        try {
            await deleteAllTransactions()
            toast({ title: "Dados apagados!", description: "Todos os dados foram apagados com sucesso.", variant: "destructive" })
            setShowClearDialog(false)
            window.location.reload()
        } finally {
            setClearingData(false)
        }
    }

    // Na conta do casal, `categories` traz as categorias dos dois parceiros
    // separadas (cada um tem sua própria cópia das categorias padrão) — aqui
    // agrupamos por nome para exibir/editar a meta uma única vez, aplicando o
    // mesmo percentual a todos os ids subjacentes daquele nome.
    const groupedCategories = useMemo(() => {
        const groups = new Map<string, { id: string; name: string; icon?: string; color: string; ids: string[] }>()
        categories.forEach((category) => {
            const key = category.name.trim().toLowerCase()
            const existing = groups.get(key)
            if (existing) {
                existing.ids.push(category.id)
            } else {
                groups.set(key, { id: category.id, name: category.name, icon: category.icon, color: category.color, ids: [category.id] })
            }
        })
        return Array.from(groups.values())
    }, [categories])

    const handlePercentageChange = (categoryIds: string[], value: number) => {
        const updated = categoryGoals.filter((g) => !categoryIds.includes(g.categoryId))
        if (value > 0) {
            categoryIds.forEach((categoryId) => updated.push({ categoryId, percentage: value }))
        }
        setCategoryGoals(updated)
    }

    const totalPercentage = useMemo(
        () =>
            groupedCategories.reduce((sum, group) => {
                const goal = categoryGoals.find((g) => group.ids.includes(g.categoryId))
                return sum + (goal?.percentage || 0)
            }, 0),
        [groupedCategories, categoryGoals],
    )

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
        isAdmin,
        theme,
        toggleTheme,
        family,
        invitingFamily,
        inviteLink,
        handleCreateInvite,
        creatingCoupleAccount,
        handleCreateCoupleAccount,
        loading,
        updatingProfile,
        savingSettings,
        clearingData,
        spendingGoal,
        setSpendingGoal,
        currency,
        setCurrency,
        monthStartDay,
        setMonthStartDay,
        weekCarryOver,
        setWeekCarryOver,
        pluggyDirectSync,
        savingDirectSync,
        handleDirectSyncChange,
        categoryGoals,
        categories,
        groupedCategories,
        showClearDialog,
        setShowClearDialog,
        user,
        setUser,
        handleUpdateProfile,
        handleSave,
        handleLogout,
        confirmClearData,
        handlePercentageChange,
        totalPercentage,
        warnings,
    }
}
