"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { TransactionForm } from "@/components/forms/transaction-form"

export default function NewTransactionPage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <PageHeader title="Nova Transação" subtitle="Registre um novo gasto ou receita" />

        <div className="rounded-[20px] bg-card p-6 md:p-8 shadow-sm border border-border/50">
          <TransactionForm />
        </div>
      </div>
    </AppLayout>
  )
}
