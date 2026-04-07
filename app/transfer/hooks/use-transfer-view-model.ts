"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getCards, addTransaction } from "@/lib/storage"
import { parseCurrencyInput, formatCurrencyInput } from "@/lib/date-utils"

export const QUICK_AMOUNTS = [2, 5, 10, 20, 50, 100, 500, 1000, 2000, 5000]

export function useTransferViewModel() {
    const router = useRouter()
    const cards = useMemo(() => getCards(), [])
    const debitCards = useMemo(() => cards.filter((c) => c.type === "debit"), [cards])

    const [fromCardId, setFromCardId] = useState("")
    const [toCardId, setToCardId] = useState("")
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")

    const handleQuickAmount = (value: number) => {
        const currentAmount = parseCurrencyInput(amount)
        const newAmount = currentAmount + value
        const cents = Math.round(newAmount * 100).toString()
        setAmount(formatCurrencyInput(cents))
    }

    const handleAmountChange = (value: string) => {
        const onlyNumbers = value.replace(/\D/g, "")
        setAmount(formatCurrencyInput(onlyNumbers))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!fromCardId || !toCardId || !amount) {
            alert("Preencha todos os campos obrigatórios")
            return
        }

        if (fromCardId === toCardId) {
            alert("Selecione contas diferentes")
            return
        }

        const numAmount = parseCurrencyInput(amount)

        if (isNaN(numAmount) || numAmount <= 0) {
            alert("Valor inválido")
            return
        }

        const fromCard = cards.find((c) => c.id === fromCardId)
        const toCard = cards.find((c) => c.id === toCardId)

        // Create expense transaction (money leaving from card)
        addTransaction({
            description: description || `Transferência para ${toCard?.name}`,
            amount: numAmount,
            type: "expense",
            categoryId: "transfer_income",
            date: new Date().toISOString(),
            recurrence: "none",
            cardId: fromCardId,
        })

        // Create income transaction (money entering to card)
        addTransaction({
            description: description || `Transferência de ${fromCard?.name}`,
            amount: numAmount,
            type: "income",
            categoryId: "transfer_expense",
            date: new Date().toISOString(),
            recurrence: "none",
            cardId: toCardId,
        })

        router.push("/")
    }

    return {
        router,
        debitCards,
        fromCardId,
        setFromCardId,
        toCardId,
        setToCardId,
        amount,
        handleAmountChange,
        handleQuickAmount,
        description,
        setDescription,
        handleSubmit
    }
}
