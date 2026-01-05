"use client"

import { useState, useEffect } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { getPendingTransactions } from "@/lib/storage" // <--- MUDANÇA IMPORTANTE
import { formatCurrency, formatDate } from "@/lib/date-utils" // Assumindo que você tem formatDate aqui
import { RepeatIcon, CalendarBlankIcon, CheckCircle } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

// Helper para formatar frequência
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
    // Buscamos as pendentes, pois recorrentes ativas estão no futuro/pendente
    const pending = getPendingTransactions()
    setTransactions(pending)
  }, [])

  // 1. LÓGICA PARA RECORRENTES (ASSINATURAS/FIXAS)
  // Filtramos apenas o que é recorrente E NÃO é parcelado
  // Usamos um Map para garantir que só apareça UMA vez cada serviço (o mais próximo)
  const recurringMap = new Map()
  
  transactions
    .filter((t) => t.recurrence && t.recurrence !== "none" && (!t.installments || t.installments <= 1))
    .forEach((t) => {
      const groupKey = t.recurrenceId || t.description
      const existing = recurringMap.get(groupKey)
      
      // Se não existe, ou se o atual (t) é mais antigo (vence antes), salvamos ele
      if (!existing || new Date(t.date) < new Date(existing.date)) {
        recurringMap.set(groupKey, t)
      }
    })

  const recurringList = Array.from(recurringMap.values()).sort((a, b) => {
    const freqOrder: Record<string, number> = { daily: 1, weekly: 2, monthly: 3, yearly: 4 }
    return (freqOrder[a.recurrence] || 99) - (freqOrder[b.recurrence] || 99)
  })

  // 2. LÓGICA PARA PARCELAMENTOS
  // Filtramos o que tem parcelas > 1
  // Agrupamos pelo ID da compra para mostrar o resumo
  const installmentMap = new Map()

  transactions
    .filter((t) => t.installments && t.installments > 1)
    .forEach((t) => {
      const groupKey = t.recurrenceId || t.description
      const existing = installmentMap.get(groupKey)

      // Pegamos sempre a parcela mais próxima de vencer para exibir
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
                    <p
                      className={cn(
                        "text-xl font-bold",
                        transaction.type === "income" ? "text-income" : "text-expense",
                      )}
                    >
                      {transaction.type === "expense" ? "-" : "+"}
                      {formatCurrency(transaction.amount)}
                    </p>
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
                // Cálculo de quanto falta (aproximado, baseado na parcela atual)
                const remainingInstallments = (transaction.installments || 1) - (transaction.currentInstallment || 1) + 1
                const remainingTotal = remainingInstallments * transaction.amount

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
                                Parcela {transaction.currentInstallment}/{transaction.installments}
                            </span>
                            <span className="text-sm text-muted-foreground">
                                Vence: {formatDate(transaction.date)}
                            </span>
                        </div>
                        {/* Barra de progresso visual simples */}
                        <div className="w-32 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                            <div 
                                className="h-full bg-primary" 
                                style={{ width: `${((transaction.currentInstallment || 1) / (transaction.installments || 1)) * 100}%` }}
                            />
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={cn(
                          "text-xl font-bold",
                          transaction.type === "income" ? "text-income" : "text-expense",
                        )}
                      >
                        {transaction.type === "expense" ? "-" : "+"}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Resta: {formatCurrency(remainingTotal)}
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