"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loginUser, registerUser } from "@/lib/auth"

export function useLoginViewModel() {
    const router = useRouter()
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")

    // Form States
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setLoading(true)

        // Simula delay de rede para UX
        await new Promise(resolve => setTimeout(resolve, 1000))

        if (isLogin) {
            const result = await loginUser(email, password)
            if (result.success) {
                router.push("/")
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
                router.push("/")
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
