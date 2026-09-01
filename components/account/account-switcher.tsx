"use client"

import { UsersThree, CaretUpDown, CheckCircle, Eye, Wallet } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAccount, type AccountSelection } from "./account-context"

function isSameSelection(a: AccountSelection, b: AccountSelection) {
    if (a.type !== b.type) return false
    if (a.type === "personal") return true
    return (a as any).id === (b as any).id
}

function accountIcon(selection: AccountSelection) {
    if (selection.type === "couple") return Wallet
    if (selection.type === "partner") return Eye
    return UsersThree
}

export function AccountSwitcher({ className }: { className?: string }) {
    const { availableAccounts, selection, selectAccount, loading } = useAccount()

    // Só uma conta disponível (sem família ainda) — nada para trocar.
    if (loading || availableAccounts.length <= 1) return null

    const current = availableAccounts.find((a) => isSameSelection(a.selection, selection)) || availableAccounts[0]
    const CurrentIcon = accountIcon(current.selection)

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "flex items-center gap-2 w-full px-3 py-2 rounded-xl bg-muted/50 border border-transparent hover:border-border transition-all text-sm font-medium text-foreground",
                        className
                    )}
                >
                    <CurrentIcon size={18} weight="bold" className="text-primary flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{current.label}</span>
                    <CaretUpDown size={16} className="text-muted-foreground flex-shrink-0" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Ver dados de</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableAccounts.map((account) => {
                    const Icon = accountIcon(account.selection)
                    const active = isSameSelection(account.selection, selection)
                    return (
                        <DropdownMenuItem
                            key={account.label + account.selection.type}
                            onClick={() => !active && selectAccount(account.selection)}
                            className="gap-2"
                        >
                            <Icon size={16} weight="bold" className="text-muted-foreground" />
                            <span className="flex-1 truncate">{account.label}</span>
                            {active && <CheckCircle size={16} weight="fill" className="text-primary" />}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
