"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { RepeatIcon, CalendarBlankIcon, XCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
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
import { useRecurringViewModel } from "../hooks/use-recurring-view-model"

export function RecurringView() {
    const {
        recurringList,
        installmentList,
        formatFrequency,
        transactionToCancel,
        setTransactionToCancel,
        confirmCancelRecurrence,
    } = useRecurringViewModel()

    return (
        <AppLayout>
            <PageHeader title="Recorrentes" subtitle="Acompanhe suas assinaturas e parcelas" />

            <div className="space-y-6">
                {/* Recurring Transactions (Assinaturas) */}
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                        <RepeatIcon weight="bold" size={24} className="text-primary" />
                        Assinaturas & Fixas
                    </h2>

                    {recurringList.length === 0 ? (
                        <div className="rounded-2xl bg-card p-8 text-center border border-border/50">
                            <p className="text-muted-foreground">Nenhuma assinatura ativa encontrada</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recurringList.map((transaction) => (
                                <div
                                    key={transaction.id}
                                    className="rounded-2xl bg-card p-5 border border-border/50 hover:border-primary/50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-foreground">{transaction.description}</h3>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                                                    <RepeatIcon size={12} weight="bold" />
                                                    {formatFrequency(transaction.recurrence || "monthly")}
                                                </span>
                                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <CalendarBlankIcon size={14} />
                                                    Vence: {formatDate(transaction.date)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-xl font-bold text-text-primary")}>
                                                {transaction.type === "expense" ? "-" : "+"}
                                                {formatCurrency(transaction.amount)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-3 pt-3 border-t border-border/50">
                                        <Button
                                            onClick={() => setTransactionToCancel(transaction.id)}
                                            variant="outline"
                                            size="sm"
                                            className="border-expense text-expense hover:bg-expense/10"
                                        >
                                            <XCircle size={16} weight="bold" className="mr-2" />
                                            Cancelar recorrência
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Installments (Parcelados) */}
                <div>
                    <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                        <CalendarBlankIcon weight="bold" size={24} className="text-primary" />
                        Compras Parceladas
                    </h2>

                    {installmentList.length === 0 ? (
                        <div className="rounded-2xl bg-card p-8 text-center border border-border/50">
                            <p className="text-muted-foreground">Nenhum parcelamento ativo encontrado</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {installmentList.map((transaction) => {
                                const totalInstallments = transaction.installments || 1;
                                const currentInstallment = transaction.currentInstallment || 1;
                                const installmentValue = transaction.amount;
                                const installmentsLeft = totalInstallments - currentInstallment + 1;
                                const remainingDebt = installmentValue * installmentsLeft;

                                return (
                                    <div
                                        key={transaction.id}
                                        className="rounded-2xl bg-card p-5 border border-border/50 flex items-center justify-between hover:border-primary/50 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-foreground">{transaction.description}</h3>
                                            <div className="flex flex-col gap-1 mt-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                                                        Parcela {currentInstallment}/{totalInstallments}
                                                    </span>
                                                    <span className="text-sm text-muted-foreground">
                                                        Vence: {formatDate(transaction.date)}
                                                    </span>
                                                </div>
                                                {/* Progress Bar */}
                                                <div className="w-32 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary"
                                                        style={{ width: `${(currentInstallment / totalInstallments) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={cn("text-xl font-bold text-text-primary")}>
                                                {transaction.type === "expense" ? "-" : "+"}
                                                {formatCurrency(installmentValue)}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Resta: {formatCurrency(remainingDebt)}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <AlertDialog open={!!transactionToCancel} onOpenChange={() => setTransactionToCancel(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancelar recorrência?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Isso cancela esta e todas as próximas ocorrências desta recorrência (meses futuros). Ocorrências já pagas em meses anteriores não são afetadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Voltar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmCancelRecurrence} className="bg-destructive text-white hover:bg-destructive/90">
                            Confirmar Cancelamento
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </AppLayout>
    )
}
