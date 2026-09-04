"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getCards, getMemberCardsMapped, addTransaction, ensureSystemCategory } from "@/lib/storage"
import { transferToFamilyMember } from "@/lib/family"
import { parseCurrencyInput, formatCurrencyInput } from "@/lib/date-utils"
import { getCurrentUser } from "@/lib/auth"
import { useAccount } from "@/components/account/account-context"
import type { Card } from "@/lib/types"

export function useTransferViewModel() {
    const router = useRouter()
    const { family } = useAccount()

    // Lido via useEffect (não direto no corpo do componente) para não pegar
    // `null` na primeira renderização (SSR/hidratação não tem localStorage) —
    // isso já causou a própria conta aparecer como opção de parceiro.
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)
    useEffect(() => {
        setCurrentUserId(getCurrentUser()?.id ?? null)
    }, [])

    const [cards, setCards] = useState<Card[]>([])
    const debitCards = useMemo(() => cards.filter((c) => c.hasDebit), [cards])

    // Outros parceiros pessoais da família (não a conta do casal) — destino
    // possível de uma transferência para "o cartão do cônjuge".
    const familyMembers = useMemo(
        () => family?.members?.filter((m) => m.accountType === "PERSONAL" && m.id !== currentUserId) ?? [],
        [family, currentUserId],
    )

    const loadCards = useCallback(async () => {
        setCards(await getCards())
    }, [])

    useEffect(() => { loadCards() }, [loadCards])

    const [fromCardId, setFromCardId] = useState("")
    const [toMemberId, setToMemberId] = useState("") // "" = uma das minhas próprias contas
    const [toCardId, setToCardId] = useState("")
    const [amount, setAmount] = useState("")
    const [description, setDescription] = useState("")

    const [memberCards, setMemberCards] = useState<Card[]>([])
    useEffect(() => {
        setToCardId("")
        if (!toMemberId) {
            setMemberCards([])
            return
        }
        let cancelled = false
        getMemberCardsMapped(toMemberId).then((memberAll) => {
            if (!cancelled) setMemberCards(memberAll.filter((c) => c.hasDebit))
        })
        return () => { cancelled = true }
    }, [toMemberId])

    const toCardOptions = toMemberId ? memberCards : debitCards.filter((c) => c.id !== fromCardId)

    const handleAmountChange = (value: string) => {
        const onlyNumbers = value.replace(/\D/g, "")
        setAmount(formatCurrencyInput(onlyNumbers))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!fromCardId || !toCardId || !amount) {
            alert("Preencha todos os campos obrigatórios")
            return
        }

        if (!toMemberId && fromCardId === toCardId) {
            alert("Selecione contas diferentes")
            return
        }

        const numAmount = parseCurrencyInput(amount)

        if (isNaN(numAmount) || numAmount <= 0) {
            alert("Valor inválido")
            return
        }

        if (toMemberId) {
            await transferToFamilyMember({ fromCardId, toMemberId, toCardId, amount: numAmount, description: description || undefined })
            router.push("/")
            return
        }

        const fromCard = cards.find((c) => c.id === fromCardId)
        const toCard = cards.find((c) => c.id === toCardId)

        // Create expense transaction (money leaving from card)
        const expenseCategoryId = await ensureSystemCategory("Transferência", "expense", "#3b82f6", "HandArrowUp")
        await addTransaction({
            description: description || `Transferência para ${toCard?.name}`,
            amount: numAmount,
            type: "expense",
            categoryId: expenseCategoryId,
            date: new Date().toISOString(),
            recurrence: "none",
            cardId: fromCardId,
        })

        // Create income transaction (money entering to card)
        const incomeCategoryId = await ensureSystemCategory("Transferência", "income", "#3b82f6", "HandArrowDown")
        await addTransaction({
            description: description || `Transferência de ${fromCard?.name}`,
            amount: numAmount,
            type: "income",
            categoryId: incomeCategoryId,
            date: new Date().toISOString(),
            recurrence: "none",
            cardId: toCardId,
        })

        router.push("/")
    }

    return {
        router,
        debitCards,
        familyMembers,
        fromCardId,
        setFromCardId,
        toMemberId,
        setToMemberId,
        toCardId,
        setToCardId,
        toCardOptions,
        amount,
        handleAmountChange,
        description,
        setDescription,
        handleSubmit
    }
}
