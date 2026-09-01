"use client"

import { motion } from "framer-motion"
import { UsersThree, CheckCircle, WarningCircle } from "@phosphor-icons/react"
import { useJoinViewModel } from "../hooks/use-join-view-model"

export function JoinView({ token }: { token: string }) {
    const { status, message } = useJoinViewModel(token)

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="w-full max-w-md bg-card border border-border rounded-[30px] shadow-2xl p-8 text-center"
            >
                {status === "loading" && (
                    <>
                        <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                            <UsersThree size={32} weight="fill" className="text-primary animate-pulse" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Entrando na família...</h2>
                        <p className="text-muted-foreground mt-2 text-sm">Aguarde enquanto confirmamos seu convite.</p>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div className="w-16 h-16 mx-auto rounded-full bg-income/10 flex items-center justify-center mb-4">
                            <CheckCircle size={32} weight="fill" className="text-income" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Convite aceito!</h2>
                        <p className="text-muted-foreground mt-2 text-sm">
                            Vocês já estão conectados. Redirecionando para as configurações...
                        </p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div className="w-16 h-16 mx-auto rounded-full bg-expense/10 flex items-center justify-center mb-4">
                            <WarningCircle size={32} weight="fill" className="text-expense" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Não foi possível aceitar o convite</h2>
                        <p className="text-muted-foreground mt-2 text-sm">{message}</p>
                    </>
                )}
            </motion.div>
        </div>
    )
}
