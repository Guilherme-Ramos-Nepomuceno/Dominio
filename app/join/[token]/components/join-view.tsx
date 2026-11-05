"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { UsersThree, CheckCircle, WarningCircle } from "@phosphor-icons/react"
import { useJoinViewModel } from "../hooks/use-join-view-model"

// Aceite do convite da família: só o estado, centralizado, sem cartão.
export function JoinView({ token }: { token: string }) {
    const { status, message } = useJoinViewModel(token)

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4">
            <motion.div
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-sm text-center"
                aria-live="polite"
            >
                {status === "loading" && (
                    <>
                        <UsersThree size={44} weight="duotone" className="mx-auto text-muted-foreground animate-pulse" />
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Entrando na família...</h1>
                        <p className="mt-2 text-sm text-muted-foreground">Confirmando o seu convite.</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <CheckCircle size={44} weight="fill" className="mx-auto text-positive-ink" />
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Convite aceito</h1>
                        <p className="mt-2 text-sm text-muted-foreground">Vocês já estão conectados. Levando você para as Configurações...</p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <WarningCircle size={44} weight="duotone" className="mx-auto text-expense" />
                        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">Não deu para aceitar o convite</h1>
                        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
                        <Link
                            href="/"
                            className="mt-6 inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                        >
                            Ir para a Home
                        </Link>
                    </>
                )}
            </motion.div>
        </div>
    )
}
