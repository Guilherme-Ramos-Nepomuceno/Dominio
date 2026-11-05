"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Wallet, ArrowRight, WarningCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { useLoginViewModel } from "../hooks/use-login-view-model"

const fieldClass =
    "w-full rounded-xl border border-border bg-transparent px-4 py-3 text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-foreground/50"

// Entrada no app, no mesmo desenho das outras telas: sem cartão nem sombra,
// só o título, os campos e uma ação.
export function LoginView() {
    const {
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
        setError
    } = useLoginViewModel()

    const switchTo = (login: boolean) => {
        setIsLogin(login)
        setError("")
    }

    return (
        <div className="min-h-screen bg-background flex flex-col px-4 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center"
            >
                <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
                        <Wallet size={20} weight="fill" className="text-background" />
                    </span>
                    <span className="text-lg font-bold text-foreground">Dominio</span>
                </div>

                <h1 className="mt-10 text-3xl font-semibold tracking-tight text-foreground text-balance">
                    {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                    {isLogin ? "Entre para ver quanto dá para gastar hoje." : "Leva um minuto. Depois montamos o plano do mês juntos."}
                </p>

                <div className="mt-8 flex rounded-full border border-border p-0.5" role="tablist" aria-label="Entrar ou criar conta">
                    {[
                        { login: true, label: "Entrar" },
                        { login: false, label: "Criar conta" },
                    ].map((tab) => {
                        const active = isLogin === tab.login
                        return (
                            <button
                                key={tab.label}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => switchTo(tab.login)}
                                className={cn(
                                    "flex-1 rounded-full py-2 text-sm transition-colors",
                                    active ? "bg-foreground font-semibold text-background" : "font-medium text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <AnimatePresence initial={false}>
                        {!isLogin && (
                            <motion.label
                                key="name-field"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="block space-y-1.5 overflow-hidden"
                            >
                                <span className="block text-xs font-medium text-muted-foreground">Nome</span>
                                <input
                                    type="text"
                                    autoComplete="name"
                                    placeholder="Como quer ser chamado"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={fieldClass}
                                />
                            </motion.label>
                        )}
                    </AnimatePresence>

                    <label className="block space-y-1.5">
                        <span className="block text-xs font-medium text-muted-foreground">Email</span>
                        <input
                            type="email"
                            autoComplete="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={fieldClass}
                            required
                        />
                    </label>

                    <label className="block space-y-1.5">
                        <span className="block text-xs font-medium text-muted-foreground">Senha</span>
                        <input
                            type="password"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={fieldClass}
                            required
                        />
                    </label>

                    {error && (
                        <p className="flex items-start gap-2 text-sm text-expense" role="alert">
                            <WarningCircle weight="fill" size={16} className="mt-0.5 shrink-0" />
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-semibold text-background transition-colors hover:bg-primary/90 disabled:opacity-60"
                    >
                        {loading ? (
                            <span className="h-5 w-5 animate-spin rounded-full border-2 border-background/30 border-t-background" aria-label="Carregando" />
                        ) : (
                            <>
                                {isLogin ? "Entrar" : "Criar conta"}
                                <ArrowRight weight="bold" className="transition-transform group-hover:translate-x-0.5" />
                            </>
                        )}
                    </button>
                </form>
            </motion.div>

            <p className="mt-10 text-center text-xs text-muted-foreground">© 2026 Dominio</p>
        </div>
    )
}
