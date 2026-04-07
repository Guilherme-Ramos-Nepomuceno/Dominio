"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { PageHeader } from "@/components/ui/page-header"
import { TransactionForm } from "./transaction-form"
import { useNewTransactionViewModel } from "../hooks/use-new-transaction-view-model"

export function NewTransactionView() {
    const { title, subtitle } = useNewTransactionViewModel()

    return (
        <AppLayout>
            <div className="max-w-2xl mx-auto">
                <PageHeader title={title} subtitle={subtitle} />

                <div className="rounded-[20px] bg-card p-6 md:p-8 shadow-sm border border-border/50">
                    <TransactionForm />
                </div>
            </div>
        </AppLayout>
    )
}
