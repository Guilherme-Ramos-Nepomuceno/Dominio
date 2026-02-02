"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { isAuthenticated } from "@/lib/auth"

export function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const pathname = usePathname()
    const [authorized, setAuthorized] = useState(false)

    useEffect(() => {
        // Routes that don't satisfy auth
        const publicRoutes = ["/login"]

        const isPublic = publicRoutes.includes(pathname)
        const isAuth = isAuthenticated()

        if (isPublic) {
            // If user is logged in and tries to go to login, redirect to home
            if (isAuth) {
                router.push("/")
                return
            }
            setAuthorized(true)
            return
        }

        if (!isAuth) {
            router.push("/login")
            setAuthorized(false)
        } else {
            setAuthorized(true)
        }
    }, [pathname, router])

    if (!authorized) {
        // You can return a loading spinner here while checking
        return null
    }

    return <>{children}</>
}
