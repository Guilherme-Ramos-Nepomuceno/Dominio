"use client"

import { Clock, CheckCircle, XCircle, Wallet, CalendarCheck, Warning } from "@phosphor-icons/react"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { getBankIcon } from "@/lib/bank-icons"
import { cn } from "@/lib/utils"
import { AppLayout } from "@/components/layout/app-layout"
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
import { usePendingViewModel } from "../hooks/use-pending-view-model"

export function PendingView() {
    const {
        categories,
        cards,
        isLoaded,
        visibleTransactions,
        selectedTransaction,
        setSelectedTransaction,
        selectedCard,
        setSelectedCard,
        confirmDate,
        setConfirmDate,
        transactionToCancel,
        setTransactionToCancel,
        transactionToCancelRecurrence,
        setTransactionToCancelRecurrence,
        handleMarkAsPaid,
        confirmPayment,
        confirmCancel,
        confirmCancelRecurrence
    } = usePendingViewModel()

    if (!isLoaded) {
        return (
            <AppLayout>
                <div className="min-h-screen bg-background flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </AppLayout>
        )
    }

    return (
        <AppLayout>
            <div className="min-h-screen bg-background">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
                    <PageHeader title="Contas a Pagar/Receber" subtitle="Gerencie suas pendências" />

                    <div className="space-y-4 mt-6">
                        {visibleTransactions.length === 0 ? (
                            <div className="text-center py-12">
                                <Clock size={48} className="mx-auto text-muted-foreground mb-4" weight="light" />
                                <p className="text-muted-foreground">Nenhuma pendência encontrada</p>
                            </div>
                        ) : (
                            visibleTransactions.map((transaction) => {
                                const category = categories.find((c) => c.id === transaction.categoryId)
                                const isExpense = category?.type === "expense"
                                const linkedCard = transaction.cardId ? cards.find(c => c.id === transaction.cardId) : null
                                const totalInst = transaction.installments || 1
                                const paidInst = transaction.paidInstallments || 0
                                const currentInst = transaction.currentInstallment || (paidInst + 1)
                                const isInstallment = totalInst > 1 && transaction.recurrence === 'none'
                                const installmentLabel = isInstallment ? `${currentInst}/${totalInst}` : transaction.recurrence === "monthly" ? "Mensal" : null

                                return (
                                    <div key={transaction.id} className="p-4 rounded-2xl bg-card border border-border hover:border-primary/50 transition-colors">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-start gap-3 flex-1">
                                                <div className="w-12 h-12 rounded-[1vw] flex items-center justify-center shrink-0" style={{ backgroundColor: category?.color + "20" }}>
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: category?.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-foreground truncate">{transaction.description}</p>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                                        <p className="text-sm text-muted-foreground">{category?.name}</p>
                                                        {installmentLabel && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">{installmentLabel}</span>}
                                                        {linkedCard && <span className="text-[10px] flex items-center gap-1 font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"><Wallet size={10} weight="fill" />{linkedCard.name}</span>}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1 capitalize">Vencimento: {formatDate(transaction.date)}</p>
                                                </div>
                                            </div>
                                            <p className={cn("font-bold text-lg text-text-primary")}>{isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}</p>
                                        </div>

                                        {selectedTransaction === transaction.id ? (
                                            <div className="space-y-4 mt-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
                                                {isInstallment && (
                                                    <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-[1vw] text-blue-500 text-xs">
                                                        <Warning size={16} weight="bold" />
                                                        <p>Isso registrará o pagamento da parcela <b>{currentInst}</b> de <b>{totalInst}</b> e a próxima ficará para o mês seguinte.</p>
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="text-sm font-medium text-foreground flex items-center gap-2 mb-2"><CalendarCheck size={16} />Data da baixa (Efetivação)</label>
                                                    <input type="date" value={confirmDate} onChange={(e) => setConfirmDate(e.target.value)} className="w-full px-4 py-2 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                                                </div>
                                                {cards.length > 0 && (
                                                    <div>
                                                        <p className="text-sm font-medium text-foreground mb-2">{isExpense ? "Debitar de qual conta?" : "Receber em qual conta?"}</p>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {cards.map((card) => {
                                                                const BankIcon = getBankIcon(card.bankName)
                                                                return (
                                                                    <button key={card.id} type="button" onClick={() => setSelectedCard(card.id)} className={cn("flex items-center gap-3 p-3 rounded-[1vw] border-2 transition-all", selectedCard === card.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-background hover:bg-muted")}>
                                                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: card.color + "20" }}><BankIcon size={24} color={card.color} weight="fill" /></div>
                                                                        <div className="flex-1 text-left"><p className="text-sm font-medium text-foreground">{card.name}</p><div className="flex items-center gap-2"><span className="text-[10px] bg-muted px-1 rounded">{card.type === 'credit' ? 'Crédito' : 'Débito'}</span></div></div>
                                                                    </button>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="flex gap-2 pt-2">
                                                    <Button onClick={() => { setSelectedTransaction(null); setSelectedCard(""); setConfirmDate(""); }} variant="outline" className="flex-1">Cancelar</Button>
                                                    <Button onClick={confirmPayment} className="flex-1 text-background"><CheckCircle size={20} weight="bold" className="mr-2" />Confirmar</Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2 mt-3">
                                                <div className="flex gap-2">
                                                    <Button onClick={() => handleMarkAsPaid(transaction.id)} className={cn("flex-1", isExpense ? "bg-expense hover:bg-expense/90 text-background" : "bg-income hover:bg-income/90 text-background")}>
                                                        <CheckCircle size={20} weight="bold" className="mr-2 text-background" />{isExpense ? "Pagar" : "Receber"}
                                                    </Button>
                                                    <Button onClick={() => setTransactionToCancel(transaction.id)} variant="outline" className="flex-1 border-expense text-expense hover:bg-expense/10">
                                                        <XCircle size={20} weight="bold" className="mr-2" />Cancelar este mês
                                                    </Button>
                                                </div>
                                                {transaction.recurrence && transaction.recurrence !== "none" && (
                                                    <Button
                                                        onClick={() => setTransactionToCancelRecurrence(transaction.id)}
                                                        variant="ghost"
                                                        className="text-xs text-muted-foreground hover:text-expense"
                                                    >
                                                        Cancelar toda a recorrência (meses futuros)
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            <AlertDialog open={!!transactionToCancel} onOpenChange={() => setTransactionToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar Transação?</AlertDialogTitle>
                        <AlertDialogDescription>Tem certeza que deseja cancelar esta transação? Ela será removida das contas a pagar/receber.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCancel} className="bg-destructive text-white hover:bg-destructive/90">Confirmar Cancelamento</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={!!transactionToCancelRecurrence} onOpenChange={() => setTransactionToCancelRecurrence(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar toda a recorrência?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso cancela esta e todas as próximas ocorrências (meses futuros), não apenas o mês atual. Meses já pagos não são afetados.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCancelRecurrence} className="bg-destructive text-white hover:bg-destructive/90">Confirmar Cancelamento</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
