"use client"

import { useEffect, useState } from "react"
import { getCurrentUser, type User, logoutUser } from "@/lib/auth"
import Link from "next/link"
import { SignOut } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"

/** `compact`: menu recolhido — só o avatar, que leva ao perfil (Configurações). */
export function UserProfileBox({ compact = false }: { compact?: boolean }) {
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        // Initial load
        setUser(getCurrentUser())

        // Listen for auth changes (like profile update)
        const handleAuthChange = () => {
            setUser(getCurrentUser())
        }
        window.addEventListener("auth-change", handleAuthChange)
        return () => window.removeEventListener("auth-change", handleAuthChange)
    }, [])

    const handleLogout = () => {
        logoutUser()
        router.push("/login")
    }

    if (!user) return null

    const avatar = (
        <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
            {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
            ) : (
                user.name.charAt(0).toUpperCase()
            )}
        </div>
    )

    if (compact) {
        return (
            <Link
                href="/settings"
                title={user.name}
                aria-label={`Perfil de ${user.name}`}
                className="flex w-fit mx-auto rounded-full hover:ring-2 hover:ring-primary/40 transition-shadow"
            >
                {avatar}
            </Link>
        )
    }

    return (
        <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/50 border border-transparent hover:border-border transition-all group">
            {avatar}

            <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate text-foreground">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>

            <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-expense transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                title="Sair"
                aria-label="Sair"
            >
                <SignOut size={20} weight="bold" />
            </button>
        </div>
    )
}
