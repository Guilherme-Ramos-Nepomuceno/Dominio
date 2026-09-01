"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { acceptFamilyInvite } from "@/lib/family"

type Status = "loading" | "success" | "error"

export function useJoinViewModel(token: string) {
    const router = useRouter()
    const [status, setStatus] = useState<Status>("loading")
    const [message, setMessage] = useState("")

    useEffect(() => {
        let cancelled = false

        acceptFamilyInvite(token)
            .then(() => {
                if (cancelled) return
                setStatus("success")
                window.dispatchEvent(new Event("auth-change"))
                setTimeout(() => router.push("/settings"), 1800)
            })
            .catch((error: any) => {
                if (cancelled) return
                setStatus("error")
                setMessage(error?.message || "Não foi possível aceitar o convite.")
            })

        return () => {
            cancelled = true
        }
    }, [token, router])

    return { status, message }
}
