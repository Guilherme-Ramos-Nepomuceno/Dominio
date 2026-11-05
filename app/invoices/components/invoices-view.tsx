"use client"

import { useState } from "react"
import { CreditCardIcon, CheckCircle, PencilSimple, ArrowLeft, ArrowRight, Info, X } from "@phosphor-icons/react"
import * as PhosphorIcons from "@phosphor-icons/react"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { getBankIcon } from "@/lib/bank-icons"
import { cn } from "@/lib/utils"
import { AppLayout } from "@/components/layout/app-layout"
import { MonthHeaderSelector } from "@/components/ui/month-header-selector"
import type { Invoice } from "@/lib/types"
import { useInvoicesViewModel } from "../hooks/use-invoices-view-model"
import { findCategory, transactionCategoryLabel } from "@/lib/category-utils"

// YYYY-MM-DD (fuso local) a partir de um ISO — pra usar em <input type="date">.
const toDateInputValue = (iso: string) => new Date(iso).toLocaleDateString("sv-SE")

// "10 nov"
const dayMonth = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "").replace(" de ", " ")

// Edita o fechamento/vencimento desta fatura específica (não o padrão do
// cartão) — remonta (via `key` no local de uso) sempre que a fatura selecionada
// muda, pra os campos partirem sempre do valor real dela.
function InvoiceDatesEditor({ invoice, onSave }: { invoice: Invoice; onSave: (updates: { closingDate?: string; dueDate?: string }) => Promise<void> }) {
    const [closingDate, setClosingDate] = useState(toDateInputValue(invoice.closingDate))
    const [dueDate, setDueDate] = useState(toDateInputValue(invoice.dueDate))
    const [isSaving, setIsSaving] = useState(false)
    const [isOpen, setIsOpen] = useState(false)

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await onSave({
                closingDate: new Date(`${closingDate}T12:00:00`).toISOString(),
                dueDate: new Date(`${dueDate}T12:00:00`).toISOString(),
            })
            setIsOpen(false)
        } finally {
            setIsSaving(false)
        }
    }

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
                Fecha {dayMonth(invoice.closingDate)} · vence {dayMonth(invoice.dueDate)}
                <PencilSimple size={12} weight="bold" aria-label="Editar datas desta fatura" />
            </button>
        )
    }

    return (
        <div className="rounded-2xl border border-border p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">Ajustar esta fatura</p>
            <p className="text-xs text-muted-foreground -mt-2">Não altera o padrão do cartão, só esta ocorrência.</p>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Fechamento</label>
                    <input
                        type="date"
                        value={closingDate}
                        onChange={(e) => setClosingDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Vencimento</label>
                    <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1 bg-transparent" onClick={() => setIsOpen(false)}>
                    Cancelar
                </Button>
                <Button type="button" className="flex-1 text-background" disabled={isSaving} onClick={handleSave}>
                    {isSaving ? "Salvando..." : "Salvar"}
                </Button>
            </div>
        </div>
    )
}

// Página corrida, no desenho do Planejar: cartões em pílulas, herói solto
// (quanto falta pagar) com uma ação só, e as compras numa lista com divisórias.
export function InvoicesView() {
    const {
        loading,
        isPaying,
        isMoving,
        cards,
        selectedMonth,
        selectedCardId,
        setSelectedCardId,
        partialAmount,
        categories,
        allTransactions,
        getFormattedMonthTitle,
        cardInvoices,
        selectedInvoice,
        handlePayFull,
        handlePayPartial,
        handleCancelTransaction,
        handlePartialAmountChange,
        handleUpdateInvoiceDates,
        handleMoveTransaction,
    } = useInvoicesViewModel()
    const [showPartial, setShowPartial] = useState(false)

    const inv = selectedInvoice
    const isPaid = !!inv && inv.total > 0 && inv.totalPending === 0
    const paidSoFar = inv ? inv.total - inv.totalPending : 0

    return (
        <AppLayout showMonthFilter>
            <PageHeader
                back="/cards"
                title="Faturas"
                subtitle={getFormattedMonthTitle(selectedMonth)}
                action={
                    <div className="hidden md:block">
                        <MonthHeaderSelector />
                    </div>
                }
            />

            {loading ? (
                <div className="max-w-2xl mx-auto space-y-10" aria-busy>
                    <div className="flex gap-2">
                        <Skeleton className="h-9 w-28 rounded-full" />
                        <Skeleton className="h-9 w-28 rounded-full" />
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-40 rounded-full" />
                        <Skeleton className="h-12 w-56 rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-full" />
                    </div>
                    <Skeleton className="h-48 rounded-xl" />
                </div>
            ) : cards.length === 0 ? (
                <div className="max-w-2xl mx-auto py-10 text-center space-y-2">
                    <CreditCardIcon size={40} weight="duotone" className="mx-auto text-muted-foreground" />
                    <h2 className="text-lg font-semibold">Nenhum cartão de crédito</h2>
                    <p className="text-sm text-muted-foreground">Cadastre um cartão com crédito em Cartões para acompanhar as faturas.</p>
                </div>
            ) : (
                <div className="max-w-2xl mx-auto space-y-10">
                    {/* Cartões: só aparecem com mais de um */}
                    {cardInvoices.length > 1 && (
                        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Cartão">
                            {cardInvoices.map((ci) => {
                                const BankIcon = getBankIcon(ci.card.bankName)
                                const selected = selectedCardId === ci.card.id
                                return (
                                    <button
                                        key={ci.card.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={selected}
                                        onClick={() => {
                                            setSelectedCardId(ci.card.id)
                                            setShowPartial(false)
                                        }}
                                        className={cn(
                                            "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                                            selected
                                                ? "border-foreground bg-foreground text-background"
                                                : "border-border text-foreground hover:bg-muted",
                                        )}
                                    >
                                        <BankIcon size={16} color={selected ? undefined : ci.card.color} weight="fill" aria-hidden />
                                        <span className="font-medium">{ci.card.name}</span>
                                        <span className={cn("tabular-nums", selected ? "text-background/70" : "text-muted-foreground")}>
                                            {formatCurrency(ci.totalPending > 0 ? ci.totalPending : ci.total)}
                                        </span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {inv && (
                        <>
                            {/* 1. Herói: quanto falta pagar e a ação */}
                            <section aria-labelledby="invoice-hero-label" className="space-y-4">
                                <div>
                                    <p id="invoice-hero-label" className="text-sm text-muted-foreground">
                                        {isPaid ? "Fatura paga" : inv.total === 0 ? "Fatura" : "Falta pagar"} · {inv.card.name}
                                        {inv.card.lastDigits && <span className="tabular-nums"> •••• {inv.card.lastDigits}</span>}
                                    </p>
                                    <p className="mt-1 text-5xl font-semibold tracking-tight leading-none tabular-nums text-foreground">
                                        {formatCurrency(isPaid ? inv.total : inv.totalPending)}
                                    </p>
                                    <div className="mt-3 space-y-1">
                                        {isPaid ? (
                                            <p className="flex items-center gap-1.5 text-sm font-medium text-positive-ink">
                                                <CheckCircle size={16} weight="fill" aria-hidden />
                                                Tudo pago nesta fatura
                                            </p>
                                        ) : paidSoFar > 0 ? (
                                            <p className="text-sm text-muted-foreground tabular-nums">
                                                <span className="font-semibold text-foreground">{formatCurrency(paidSoFar)}</span> já pago de{" "}
                                                {formatCurrency(inv.total)}
                                            </p>
                                        ) : null}
                                        {inv.invoice ? (
                                            <InvoiceDatesEditor key={inv.invoice.id} invoice={inv.invoice} onSave={handleUpdateInvoiceDates} />
                                        ) : (
                                            inv.card.dueDate && <p className="text-xs text-muted-foreground">Vence dia {inv.card.dueDate}</p>
                                        )}
                                    </div>
                                </div>

                                {inv.totalPending > 0 && (
                                    <div className="space-y-3">
                                        <button
                                            type="button"
                                            onClick={handlePayFull}
                                            disabled={isPaying}
                                            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-background font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
                                        >
                                            {isPaying ? "Pagando..." : `Pagar ${formatCurrency(inv.totalPending)}`}
                                        </button>

                                        {showPartial ? (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={partialAmount}
                                                        onChange={(e) => handlePartialAmountChange(e.target.value)}
                                                        placeholder="0,00"
                                                        aria-label="Valor do pagamento parcial"
                                                        className="flex-1 min-w-0 rounded-full border border-border bg-transparent px-4 py-2.5 text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handlePayPartial}
                                                        disabled={isPaying}
                                                        className="shrink-0 rounded-full border border-border px-4 text-sm font-semibold text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                                    >
                                                        {isPaying ? "Pagando..." : "Pagar parte"}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Paga as compras mais antigas até esse valor (máximo {formatCurrency(inv.totalPending)}).
                                                </p>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => setShowPartial(true)}
                                                className="block w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                Pagar só uma parte
                                            </button>
                                        )}
                                    </div>
                                )}
                            </section>

                            {/* 2. Compras da fatura */}
                            <section aria-labelledby="invoice-items-title">
                                <SectionTitle id="invoice-items-title">
                                    {inv.transactions.length === 1 ? "1 compra" : `${inv.transactions.length} compras`}
                                </SectionTitle>

                                {inv.transactions.length === 0 ? (
                                    <p className="mt-3 text-sm text-muted-foreground">Nenhuma compra nesta fatura.</p>
                                ) : (
                                    <ul className="mt-1 divide-y divide-border">
                                        {inv.transactions.map((transaction) => {
                                            const category = findCategory(categories, transaction.categoryId)
                                            const paid = transaction.status === "paid"
                                            const CategoryIcon =
                                                (category?.icon && PhosphorIcons[category.icon as keyof typeof PhosphorIcons]) ||
                                                (transaction.categoryId ? PhosphorIcons.Circle : PhosphorIcons.Tag)
                                            // A data principal é a desta parcela (o mês exibido); a data da
                                            // compra original aparece a partir da 2ª parcela.
                                            const purchase = transaction.parentId
                                                ? allTransactions.find((t) => t.id === transaction.parentId)
                                                : null
                                            const meta = [
                                                transactionCategoryLabel(categories, transaction),
                                                formatDate(transaction.date),
                                                transaction.installments > 1 ? `${transaction.currentInstallment}/${transaction.installments}` : null,
                                            ].filter(Boolean)

                                            return (
                                                <li key={transaction.id} className={cn("flex items-start gap-3 py-3.5", paid && "opacity-60")}>
                                                    {/* @ts-ignore - Dynamic icon component */}
                                                    <CategoryIcon size={22} weight="duotone" className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="truncate font-medium text-foreground">{transaction.description}</p>
                                                        <p className={cn("truncate text-xs text-muted-foreground tabular-nums", !transaction.categoryId && "italic")}>
                                                            {meta.join(" · ")}
                                                        </p>
                                                        {purchase && (
                                                            <p className="text-[11px] text-muted-foreground">Comprou em {formatDate(purchase.date)}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex shrink-0 flex-col items-end gap-1">
                                                        <span className="font-semibold tabular-nums text-foreground">{formatCurrency(transaction.amount)}</span>
                                                        {paid ? (
                                                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-positive-ink">
                                                                <CheckCircle size={11} weight="fill" aria-hidden /> pago
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-0.5 text-muted-foreground">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMoveTransaction(transaction.id, "previous")}
                                                                    disabled={isMoving}
                                                                    title="Mover para a fatura anterior"
                                                                    aria-label="Mover para a fatura anterior"
                                                                    className="rounded-md p-1 hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                                                                >
                                                                    <ArrowLeft size={13} weight="bold" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleMoveTransaction(transaction.id, "next")}
                                                                    disabled={isMoving}
                                                                    title="Mover para a fatura seguinte"
                                                                    aria-label="Mover para a fatura seguinte"
                                                                    className="rounded-md p-1 hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
                                                                >
                                                                    <ArrowRight size={13} weight="bold" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleCancelTransaction(transaction.id)}
                                                                    title="Cancelar compra"
                                                                    aria-label="Cancelar compra"
                                                                    className="rounded-md p-1 hover:bg-expense/10 hover:text-expense transition-colors"
                                                                >
                                                                    <X size={13} weight="bold" />
                                                                </button>
                                                            </span>
                                                        )}
                                                    </div>
                                                </li>
                                            )
                                        })}
                                    </ul>
                                )}

                                {inv.totalPending > 0 && (
                                    <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                                        <Info size={14} weight="duotone" className="mt-px shrink-0" aria-hidden />
                                        Compras no cartão levam de 1 a 3 dias úteis para chegar do banco. Se faltar alguma, sincronize de novo depois desse prazo.
                                    </p>
                                )}
                            </section>
                        </>
                    )}
                </div>
            )}
        </AppLayout>
    )
}
