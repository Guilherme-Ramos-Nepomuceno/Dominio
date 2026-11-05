"use client"

import Link from "next/link"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { getBankIcon } from "@/lib/bank-icons"
import { parseCurrencyInput } from "@/lib/date-utils"
import { Check, CreditCard, ArrowsLeftRight } from "@phosphor-icons/react"
import type { Card } from "@/lib/types"
import { cn } from "@/lib/utils"
import { useTransferViewModel } from "../hooks/use-transfer-view-model"

// Lista de contas para escolher (De / Para): uma linha por conta, a
// escolhida com o ✓ — sem cartão grande em volta de cada uma.
function AccountList({ cards, value, onChange, label }: { cards: Card[]; value: string; onChange: (id: string) => void; label: string }) {
    return (
        <ul className="mt-1 divide-y divide-border" role="radiogroup" aria-label={label}>
            {cards.map((card) => {
                const BankIcon = getBankIcon(card.bankName)
                const selected = value === card.id
                return (
                    <li key={card.id}>
                        <button
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onChange(card.id)}
                            className="flex w-full items-center gap-3 py-3 text-left"
                        >
                            <BankIcon size={22} color={card.color} weight="fill" className="shrink-0" aria-hidden />
                            <span className="min-w-0 flex-1">
                                <span className={cn("block truncate text-sm", selected ? "font-semibold text-foreground" : "font-medium text-foreground/85")}>
                                    {card.name}
                                </span>
                                <span className="block text-xs text-muted-foreground tabular-nums">•••• {card.lastDigits}</span>
                            </span>
                            <span
                                className={cn(
                                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                    selected ? "border-foreground bg-foreground text-background" : "border-border",
                                )}
                                aria-hidden
                            >
                                {selected && <Check size={12} weight="bold" />}
                            </span>
                        </button>
                    </li>
                )
            })}
        </ul>
    )
}

export function TransferView() {
    const {
        loading,
        isSubmitting,
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
        handleSubmit,
    } = useTransferViewModel()

    if (loading) {
        return (
            <AppLayout>
                <PageHeader back="/all-menus" title="Transferir" />
                <div className="max-w-2xl mx-auto space-y-10" aria-busy>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-24 rounded-full" />
                        <Skeleton className="h-12 w-52 rounded-xl" />
                    </div>
                    <Skeleton className="h-32 rounded-xl" />
                </div>
            </AppLayout>
        )
    }

    if (debitCards.length === 0) {
        return (
            <AppLayout>
                <PageHeader back="/all-menus" title="Transferir" />
                <div className="max-w-2xl mx-auto py-10 text-center space-y-3">
                    <ArrowsLeftRight size={40} weight="duotone" className="mx-auto text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Nenhuma conta para transferir</h2>
                    <p className="text-sm text-muted-foreground">
                        Transferências saem de uma conta com débito. Cartão só de crédito não transfere.
                    </p>
                    <Link
                        href="/cards"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-background text-sm font-semibold hover:bg-primary/90 transition-colors"
                    >
                        <CreditCard size={16} weight="bold" />
                        Abrir Cartões
                    </Link>
                </div>
            </AppLayout>
        )
    }

    const value = amount ? parseCurrencyInput(amount) : 0
    const canSubmit = !!fromCardId && !!toCardId && value > 0 && !isSubmitting
    const fromName = debitCards.find((c) => c.id === fromCardId)?.name
    const toName = toCardOptions.find((c) => c.id === toCardId)?.name

    return (
        <AppLayout>
            <PageHeader back="/all-menus" title="Transferir" />

            {/* Página corrida, no desenho do Planejar: o valor é o herói; depois
                de onde sai e para onde vai, numa lista simples cada. */}
            <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-10 pb-10">
                {/* 1. Valor */}
                <section>
                    <label htmlFor="transfer-amount" className="text-sm text-muted-foreground">
                        Quanto
                    </label>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-semibold text-muted-foreground">R$</span>
                        <input
                            id="transfer-amount"
                            type="text"
                            inputMode="numeric"
                            value={amount}
                            onChange={(e) => handleAmountChange(e.target.value)}
                            placeholder="0,00"
                            autoFocus
                            required
                            className="w-full min-w-0 bg-transparent text-5xl font-semibold tracking-tight leading-none tabular-nums text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
                        />
                    </div>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Descrição (opcional) — ex: aluguel"
                        aria-label="Descrição (opcional)"
                        className="mt-4 w-full border-b border-border bg-transparent pb-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground/60 focus:outline-none"
                    />
                </section>

                {/* 2. De */}
                <section aria-labelledby="transfer-from-title">
                    <SectionTitle id="transfer-from-title">De</SectionTitle>
                    <AccountList
                        label="Conta de origem"
                        cards={debitCards}
                        value={fromCardId}
                        onChange={(id) => {
                            setFromCardId(id)
                            // A mesma conta não pode ser origem e destino.
                            if (!toMemberId && toCardId === id) setToCardId("")
                        }}
                    />
                </section>

                {/* 3. Para: minhas contas ou a conta de alguém da família */}
                <section aria-labelledby="transfer-to-title">
                    <SectionTitle id="transfer-to-title">Para</SectionTitle>
                    {familyMembers.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Para quem">
                            {[{ id: "", label: "Minhas contas" }, ...familyMembers.map((m) => ({ id: m.id, label: m.name || m.email }))].map((opt) => {
                                const selected = toMemberId === opt.id
                                return (
                                    <button
                                        key={opt.id || "me"}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => setToMemberId(opt.id)}
                                        className={cn(
                                            "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                                            selected ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-muted",
                                        )}
                                    >
                                        {opt.label}
                                    </button>
                                )
                            })}
                        </div>
                    )}
                    {toCardOptions.length === 0 ? (
                        <p className="mt-3 text-sm text-muted-foreground">
                            {toMemberId
                                ? "Essa pessoa ainda não tem uma conta de débito cadastrada."
                                : "Você não tem outra conta de débito. Cadastre mais uma ou envie para alguém da família."}
                        </p>
                    ) : (
                        <AccountList label="Conta de destino" cards={toCardOptions} value={toCardId} onChange={setToCardId} />
                    )}
                </section>

                {/* 4. Confirmar */}
                <div className="space-y-2">
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="flex h-12 w-full items-center justify-center rounded-full bg-primary font-semibold text-background hover:bg-primary/90 transition-colors disabled:opacity-40"
                    >
                        {isSubmitting ? "Transferindo..." : value > 0 ? `Transferir R$ ${amount}` : "Transferir"}
                    </button>
                    {fromName && toName && (
                        <p className="text-center text-xs text-muted-foreground">
                            De {fromName} para {toName}
                        </p>
                    )}
                </div>
            </form>
        </AppLayout>
    )
}
