"use client"

import Link from "next/link"
import { ArrowsLeftRight } from "@phosphor-icons/react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { SkeletonSection, SkeletonSummary } from "@/components/ui/loading-skeletons"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { formatCurrency } from "@/lib/date-utils"
import { AccountRow, CreditCardRow, type CardActions } from "./card-item"
import { AddCardDialog } from "./add-card-dialog"
import { EditCardDialog } from "./edit-card-dialog"
import { MergeCardDialog } from "./merge-card-dialog"
import { ImportStatementDialog } from "./import-statement-dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useAccount } from "@/components/account/account-context"
import { useCardsViewModel } from "../hooks/use-cards-view-model"

export function CardsView() {
    const {
        loading,
        isDialogOpen,
        setIsDialogOpen,
        cardToDelete,
        setCardToDelete,
        editingCard,
        setEditingCard,
        mergingCard,
        setMergingCard,
        importingCard,
        setImportingCard,
        processedCards,
        confirmDeleteCard,
        handleCreateSuccess,
        handleSaveEdit,
        handleMerge,
        loadData,
    } = useCardsViewModel()
    const { isReadOnly } = useAccount()

    // Cartão combinado aparece nas duas listas: a fatura em crédito, o saldo em
    // contas. Exceção: crédito vinculado ao banco sem conta corrente vinculada —
    // o "saldo" ali seria só a soma dos registros, sem saldo real por trás.
    const creditCards = processedCards.filter((c) => c.hasCredit)
    const accounts = processedCards.filter((c) => c.hasDebit && !(c.bank?.credit && !c.bank?.account)).sort((a, b) => (b.calculatedBalance ?? 0) - (a.calculatedBalance ?? 0))
    const totalBalance = accounts.reduce((sum, c) => sum + (c.calculatedBalance ?? 0), 0)
    const totalInvoices = creditCards.reduce((sum, c) => sum + c.spentAmount, 0)
    const actionsFor: CardActions = isReadOnly
        ? {}
        : { onDelete: (id) => setCardToDelete(id), onEdit: setEditingCard, onMerge: setMergingCard, onImport: setImportingCard }

    return (
        <AppLayout primaryAction={{ label: "Adicionar cartão", onPress: () => setIsDialogOpen(true) }}>
            <div className="max-w-2xl mx-auto space-y-10 pb-24 md:pb-10">
                <PageHeader back="/all-menus" title="Cartões e contas" subtitle="Onde está o seu dinheiro" />

                {loading ? (
                    <>
                        <SkeletonSummary />
                        <SkeletonSection count={2} />
                        <SkeletonSection count={3} />
                    </>
                ) : (
                    <>
                        {/* Resumo */}
                        <section aria-label="Resumo" className="space-y-4">
                            <div className="flex items-baseline gap-6">
                                <div>
                                    <p className="text-xs text-muted-foreground">Nas contas</p>
                                    <p className={cn("text-2xl font-semibold tabular-nums", totalBalance < 0 ? "text-expense" : "text-foreground")}>{formatCurrency(totalBalance)}</p>
                                </div>
                                {creditCards.length > 0 && (
                                    <div>
                                        <p className="text-xs text-muted-foreground">Nos cartões</p>
                                        <p className="text-2xl font-semibold tabular-nums text-foreground">{formatCurrency(totalInvoices)}</p>
                                    </div>
                                )}
                            </div>
                            {!isReadOnly && <Link href="/transfer" className="inline-flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors">
                                <ArrowsLeftRight size={14} weight="bold" />
                                Transferir
                            </Link>}
                        </section>

                        {creditCards.length > 0 && (
                            <section aria-labelledby="cards-credit">
                                <div className="flex items-baseline justify-between">
                                    <SectionTitle id="cards-credit">Cartões de crédito</SectionTitle>
                                    <Link href="/invoices" className="text-xs font-medium text-primary hover:underline">Faturas ›</Link>
                                </div>
                                <ul className="mt-1 divide-y divide-border">
                                    {creditCards.map((card) => (
                                        <CreditCardRow key={card.id} card={card} invoice={card.spentAmount} actions={actionsFor} />
                                    ))}
                                </ul>
                            </section>
                        )}

                        {accounts.length > 0 && (
                            <section aria-labelledby="cards-accounts">
                                <SectionTitle id="cards-accounts">Contas</SectionTitle>
                                <ul className="mt-1 divide-y divide-border">
                                    {accounts.map((card) => (
                                        <AccountRow
                                            key={card.id}
                                            card={card}
                                            balance={card.calculatedBalance}
                                            spent={card.debitSpentAmount}
                                            savingsGoals={card.cardGoals}
                                            actions={actionsFor}
                                        />
                                    ))}
                                </ul>
                            </section>
                        )}

                        {processedCards.length === 0 && (
                            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma conta ainda. Toque no + para adicionar a primeira.</p>
                        )}
                    </>
                )}
            </div>

            {!isReadOnly && (
                <>
                    <AddCardDialog
                        isOpen={isDialogOpen}
                        onClose={() => setIsDialogOpen(false)}
                        onSuccess={handleCreateSuccess}
                    />

                    <EditCardDialog
                        key={`edit-${editingCard?.id ?? "none"}`}
                        card={editingCard}
                        onSave={handleSaveEdit}
                        onClose={() => setEditingCard(null)}
                    />

                    <MergeCardDialog
                        card={mergingCard}
                        otherCards={processedCards.filter((c) => c.id !== mergingCard?.id)}
                        onMerge={handleMerge}
                        onClose={() => setMergingCard(null)}
                    />

                    <ImportStatementDialog
                        key={`import-${importingCard?.id ?? "none"}`}
                        card={importingCard}
                        onImported={loadData}
                        onClose={() => setImportingCard(null)}
                    />
                </>
            )}

            <AlertDialog open={!!cardToDelete} onOpenChange={() => setCardToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir esta conta?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja remover este cartão? O histórico de transações vinculado a ele poderá ser afetado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteCard} className="bg-destructive text-white hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
