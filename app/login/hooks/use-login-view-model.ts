"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser, loginUser, registerUser } from "@/lib/auth"
import { onboardingPendingKey } from "@/lib/onboarding"

export function useLoginViewModel() {
    const router = useRouter()
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Form States
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const redirectAfterAuth = (isNewAccount = false) => {
        const pendingInvite = sessionStorage.getItem("finance-post-login-redirect")
        if (pendingInvite) {
            sessionStorage.removeItem("finance-post-login-redirect")
            router.push(pendingInvite)
            return
        }
        // Conta nova: começa pelo onboarding (renda → plano → desejo).
        router.push(isNewAccount ? "/onboarding" : "/")
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        // Simula delay de rede para UX
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (isLogin) {
            const result = await loginUser(email, password)
            if (result.success) {
                redirectAfterAuth()
            } else {
                setError(result.message || "Erro ao entrar")
                setLoading(false)
            }
        } else {
            if (!name) {
                setError("Nome é obrigatório")
                setLoading(false)
                return
            }
            const result = await registerUser(name, email, password)
            if (result.success) {
                // Marca o onboarding como pendente (a Home também redireciona
                // para lá se a pessoa sair antes de terminar ou pular).
                const user = getCurrentUser()
                if (user) {
                    try {
                        localStorage.setItem(onboardingPendingKey(user.id), "1")
                    } catch {
                        // sem a flag, a Home ainda oferece o onboarding pelo card
                    }
                }
                redirectAfterAuth(true)
            } else {
                setError(result.message || "Erro ao cadastrar")
                setLoading(false)
            }
        }
    }

    const toggleMode = () => {
        setIsLogin(prev => !prev)
        setError("")
    }

    return {
        isLogin,
        setIsLogin,
        loading,
        error,
        name,
        setName,
        email,
        setEmail,
        password,
        setPassword,
        handleSubmit,
        toggleMode,
        setError
    }
}
