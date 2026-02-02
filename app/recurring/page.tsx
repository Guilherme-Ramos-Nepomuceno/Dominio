"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { getPendingTransactions } from "@/lib/storage"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { RepeatIcon, CalendarBlankIcon } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

// Helper para formatar frequência (mantido igual)
const formatFrequency = (freq: string) => {
  const map: Record<string, string> = {
    daily: "Diário",
    weekly: "Semanal",
    monthly: "Mensal",
    yearly: "Anual",
  }
  return map[freq] || freq
}

export default function RecurringPage() {
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    const pending = getPendingTransactions()
    setTransactions(pending)
  }, [])

  // 1. LÓGICA PARA RECORRENTES (MANTIDA IGUAL)
  const recurringMap = new Map()
  transactions
    .filter((t) => t.recurrence && t.recurrence !== "none" && (!t.installments || t.installments <= 1))
    .forEach((t) => {
      const groupKey = t.recurrenceId || t.description
      const existing = recurringMap.get(groupKey)
      if (!existing || new Date(t.date) < new Date(existing.date)) {
        recurringMap.set(groupKey, t)
      }
    })

  const recurringList = Array.from(recurringMap.values()).sort((a, b) => {
    const freqOrder: Record<string, number> = { daily: 1, weekly: 2, monthly: 3, yearly: 4 }
    return (freqOrder[a.recurrence] || 99) - (freqOrder[b.recurrence] || 99)
  })

  // 2. LÓGICA PARA PARCELAMENTOS (MANTIDA IGUAL)
  const installmentMap = new Map()
  transactions
    .filter((t) => t.installments && t.installments > 1)
    .forEach((t) => {
      const groupKey = t.recurrenceId || t.description
      const existing = installmentMap.get(groupKey)
      if (!existing || new Date(t.date) < new Date(existing.date)) {
        installmentMap.set(groupKey, t)
      }
    })

  const installmentList = Array.from(installmentMap.values()).sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  return (
    <AppLayout>
      <PageHeader title="Recorrentes" subtitle="Acompanhe suas assinaturas e parcelas" />

      <div className="space-y-6">
        {/* Recurring Transactions (Assinaturas) - SEM ALTERAÇÕES VISUAIS */}
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
                  className="rounded-2xl bg-card p-5 border border-border/50 flex items-center justify-between hover:border-primary/50 transition-colors"
                >
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
              ))}
            </div>
          )}
        </div>

        {/* Installments (Parcelados) - AQUI ESTÁ A CORREÇÃO */}
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
                // --- CORREÇÃO DE CÁLCULO ---
                const totalAmount = transaction.amount;
                const totalInstallments = transaction.installments || 1;
                const currentInstallment = transaction.currentInstallment || 1;

                // 1. O valor salvo JÁ É o da parcela individual (Devido à mudança no storage)
                const installmentValue = transaction.amount;

                // 2. Quantas parcelas faltam (Total - Atual + 1 para incluir a atual pendente)
                const installmentsLeft = totalInstallments - currentInstallment + 1;

                // 3. Valor restante da dívida (Parcela * Quantas faltam)
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
                        {/* Barra de progresso */}
                        <div className="w-32 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${(currentInstallment / totalInstallments) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {/* Exibe o valor da PARCELA, não o total */}
                      <p className={cn("text-xl font-bold text-text-primary")}>
                        {transaction.type === "expense" ? "-" : "+"}
                        {formatCurrency(installmentValue)}
                      </p>

                      {/* Exibe o total restante calculado corretamente */}
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
    </AppLayout>
  )
}