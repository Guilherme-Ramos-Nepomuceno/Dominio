"use client"

import { useRouter } from "next/navigation"
import { X } from "@phosphor-icons/react"
import { TransactionForm } from "./transaction-form"
import { useNewTransactionViewModel } from "../hooks/use-new-transaction-view-model"

// Tela cheia (mesmo padrão visual dos modais de cadastro — ex: Nova Categoria)
// em vez de uma página dentro do AppLayout, para não mostrar o menu inferior
// nem o header enquanto o usuário está registrando a transação.
export function NewTransactionView() {
    const { title, subtitle } = useNewTransactionViewModel()
    const router = useRouter()

    return (
        <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-2xl h-[92vh] md:h-auto md:max-h-[90vh] rounded-t-3xl md:rounded-3xl p-6 md:p-8 space-y-6 overflow-y-auto">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-foreground">{title}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-muted transition-colors shrink-0"
                    >
                        <X size={20} weight="bold" />
                    </button>
                </div>

                <TransactionForm />
            </div>
        </div>
    )
}
