"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { CircularBalance } from "./circular-balance"
import { IncomeExpenseCards } from "./income-expense-cards"
import { RecentTransactions } from "./recent-transactions"
import { useHomeViewModel } from "../hooks/use-home-view-model"

export function HomeView() {
    const { period, setPeriod, balanceData } = useHomeViewModel()

    return (
        <AppLayout>
            <div className="space-y-6">
                {/* Circular Balance Display */}
                <CircularBalance
                    balance={balanceData.totalBalance}
                    income={balanceData.income}
                    expense={balanceData.expense}
                    checkingBalance={balanceData.checkingBalance}
                    totalSavings={balanceData.totalSavings}
                />

                {/* Income/Expense Cards with Mini Charts */}
                <IncomeExpenseCards
                    income={balanceData.income}
                    expense={balanceData.expense}
                    transactions={balanceData.transactions}
                    period={period}
                    onPeriodChange={setPeriod}
                />

                {/* Recent Transactions */}
                <RecentTransactions transactions={balanceData.transactions} />
            </div>
        </AppLayout>
    )
}
