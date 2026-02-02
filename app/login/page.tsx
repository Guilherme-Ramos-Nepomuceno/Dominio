"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Wallet, Envelope, Lock, User as UserIcon, ArrowRight, WarningCircle } from "@phosphor-icons/react"
import { loginUser, registerUser } from "@/lib/auth"
import { cn } from "@/lib/utils"

export default function LoginPage() {
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
            const result = loginUser(email, password)
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
            const result = registerUser(name, email, password)
            if (result.success) {
                router.push("/")
            } else {
                setError(result.message || "Erro ao cadastrar")
                setLoading(false)
            }
        }
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">

            <div className="w-full max-w-md">
                {/* Logo Animation */}
                <div className="flex justify-center mb-8">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="w-20 h-20 bg-primary rounded-[20px] flex items-center justify-center shadow-lg shadow-primary/20"
                    >
                        <Wallet size={40} weight="fill" className="text-primary-foreground" />
                    </motion.div>
                </div>

                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-card border border-border rounded-[30px] shadow-2xl overflow-hidden relative"
                >
                    {/* Header */}
                    <div className="p-8 pb-0 text-center">
                        <h2 className="text-2xl font-bold text-foreground">
                            {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
                        </h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            {isLogin ? "Acesse suas finanças com segurança" : "Comece a controlar seu dinheiro hoje"}
                        </p>
                    </div>

                    {/* Tab Switcher */}
                    <div className="flex justify-center mt-6 px-8">
                        <div className="bg-muted p-1 rounded-full flex w-full relative">
                            <motion.div
                                className="absolute bg-background shadow-sm rounded-full h-[calc(100%-8px)] top-1"
                                initial={false}
                                animate={{
                                    width: "50%",
                                    x: isLogin ? 0 : "100%"
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                            <button
                                onClick={() => { setIsLogin(true); setError("") }}
                                className={cn("flex-1 py-2 text-sm font-medium relative z-10 transition-colors", isLogin ? "text-foreground" : "text-muted-foreground")}
                            >
                                Login
                            </button>
                            <button
                                onClick={() => { setIsLogin(false); setError("") }}
                                className={cn("flex-1 py-2 text-sm font-medium relative z-10 transition-colors", !isLogin ? "text-foreground" : "text-muted-foreground")}
                            >
                                Cadastro
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="p-8 pt-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <AnimatePresence mode="wait">
                                {!isLogin && (
                                    <motion.div
                                        key="name-field"
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="relative">
                                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                            <input
                                                type="text"
                                                placeholder="Seu nome"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full bg-muted/50 border border-transparent focus:border-primary/50 focus:bg-background rounded-2xl py-3 pl-12 pr-4 outline-none transition-all placeholder:text-muted-foreground/50"
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="relative">
                                <Envelope className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                <input
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-muted/50 border border-transparent focus:border-primary/50 focus:bg-background rounded-2xl py-3 pl-12 pr-4 outline-none transition-all placeholder:text-muted-foreground/50"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={20} />
                                <input
                                    type="password"
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-muted/50 border border-transparent focus:border-primary/50 focus:bg-background rounded-2xl py-3 pl-12 pr-4 outline-none transition-all placeholder:text-muted-foreground/50"
                                    required
                                />
                            </div>

                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center gap-2 text-expense text-sm bg-expense/10 p-3 rounded-xl"
                                >
                                    <WarningCircle weight="fill" />
                                    {error}
                                </motion.div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-primary text-primary-foreground font-semibold h-12 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group mt-4 disabled:opacity-70 disabled:hover:translate-y-0"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        {isLogin ? "Entrar" : "Criar Conta"}
                                        <ArrowRight weight="bold" className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </motion.div>

                <p className="text-center text-muted-foreground text-xs mt-8">
                    © 2026 Dominio Finance. Seus dados são salvos localmente.
                </p>

            </div>
        </div>
    )
}
