"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { X } from "@phosphor-icons/react"
import { TransactionForm } from "./transaction-form"
import { useNewTransactionViewModel } from "../hooks/use-new-transaction-view-model"

// Tela cheia (mesmo padrão visual das folhas de cadastro — ex: Nova categoria)
// em vez de uma página dentro do AppLayout, para não mostrar o menu inferior
// nem o header enquanto o usuário está registrando a transação.
export function NewTransactionView() {
    const { title } = useNewTransactionViewModel()
    const router = useRouter()

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.back()
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [router])

    return (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-background w-full max-w-2xl h-[92vh] md:h-auto md:max-h-[90vh] rounded-t-3xl md:rounded-3xl border-t border-border md:border px-6 pt-6 pb-8 md:px-8 md:pt-7 space-y-6 overflow-y-auto">
                <div className="flex items-center justify-between gap-4">
                    <h1 className="text-sm font-medium text-muted-foreground">{title}</h1>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        aria-label="Fechar"
                        className="p-2 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                    >
                        <X size={18} weight="bold" />
                    </button>
                </div>

                <TransactionForm />
            </div>
        </div>
    )
}
