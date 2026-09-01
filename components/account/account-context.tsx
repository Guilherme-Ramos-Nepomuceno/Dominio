"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { getCurrentUser } from "@/lib/auth"
import { getActiveAccountSelection, setActiveAccountSelection, type AccountSelection } from "@/lib/active-account"
import { getFamily, type FamilyMember, type FamilyOverview } from "@/lib/family"

export type { AccountSelection }

interface AccountContextValue {
    loading: boolean
    family: FamilyOverview | null
    selection: AccountSelection
    isReadOnly: boolean
    availableAccounts: { selection: AccountSelection; label: string }[]
    selectAccount: (selection: AccountSelection) => void
    refreshFamily: () => Promise<void>
}

const AccountContext = createContext<AccountContextValue | null>(null)

export function AccountProvider({ children }: { children: ReactNode }) {
    const [family, setFamily] = useState<FamilyOverview | null>(null)
    const [selection, setSelectionState] = useState<AccountSelection>({ type: "personal" })
    const [loading, setLoading] = useState(true)

    const refreshFamily = useCallback(async () => {
        if (!getCurrentUser()) {
            setLoading(false)
            return
        }
        try {
            const overview = await getFamily()
            setFamily(overview)
        } catch {
            // Sem família ainda, ou API fora do ar — segue apenas com a conta pessoal.
            setFamily(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        setSelectionState(getActiveAccountSelection())
        refreshFamily()

        const handleAuthChange = () => refreshFamily()
        window.addEventListener("auth-change", handleAuthChange)
        return () => window.removeEventListener("auth-change", handleAuthChange)
    }, [refreshFamily])

    const selectAccount = useCallback((next: AccountSelection) => {
        setSelectionState(next)
        setActiveAccountSelection(next)
        // Recarrega para garantir que toda a UI que busca de lib/storage.ts reflita a troca imediatamente.
        window.location.reload()
    }, [])

    const availableAccounts = useMemo(() => {
        const currentUser = getCurrentUser()
        const accounts: { selection: AccountSelection; label: string }[] = [
            { selection: { type: "personal" }, label: currentUser ? `${currentUser.name} (você)` : "Minha conta" },
        ]

        if (!family?.members) return accounts

        family.members.forEach((member: FamilyMember) => {
            if (currentUser && member.id === currentUser.id) return

            if (member.accountType === "COUPLE") {
                accounts.push({ selection: { type: "couple", id: member.id, name: member.name || "Conta do Casal" }, label: member.name || "Conta do Casal" })
            } else {
                accounts.push({ selection: { type: "partner", id: member.id, name: member.name || member.email }, label: `${member.name || member.email} (somente leitura)` })
            }
        })

        return accounts
    }, [family])

    const value: AccountContextValue = {
        loading,
        family,
        selection,
        isReadOnly: selection.type === "partner",
        availableAccounts,
        selectAccount,
        refreshFamily,
    }

    return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccount() {
    const context = useContext(AccountContext)
    if (!context) throw new Error("useAccount deve ser usado dentro de um AccountProvider")
    return context
}
