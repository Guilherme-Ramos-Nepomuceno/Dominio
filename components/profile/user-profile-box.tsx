"use client"

import { useEffect, useState } from "react"
import { getCurrentUser, type User, logoutUser } from "@/lib/auth"
import { SignOut, UserCircle } from "@phosphor-icons/react"
import { useRouter } from "next/navigation"

export function UserProfileBox() {
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

    return (
        <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-transparent hover:border-border transition-all group">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-lg">
                    {user.avatar ? (
                        <img src={user.avatar} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                    ) : (
                        user.name.charAt(0).toUpperCase()
                    )}
                </div>

                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate text-foreground">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>

                <button
                    onClick={handleLogout}
                    className="text-muted-foreground hover:text-expense transition-colors opacity-0 group-hover:opacity-100"
                    title="Sair"
                >
                    <SignOut size={20} weight="bold" />
                </button>
            </div>
        </div>
    )
}
