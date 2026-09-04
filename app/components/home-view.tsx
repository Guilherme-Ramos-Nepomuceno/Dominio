"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { CircularBalance } from "./circular-balance"
import { IncomeExpenseCards } from "./income-expense-cards"
import { RecentTransactions } from "./recent-transactions"
import { RecentTransfers } from "./recent-transfers"
import { CasalFamiliaToggle } from "./casal-familia-toggle"
import { useHomeViewModel } from "../hooks/use-home-view-model"

export function HomeView() {
    const {
        period,
        setPeriod,
        balanceData,
        viewMode,
        setViewMode,
        isCoupleAccount,
        loadingFamilyData,
        cards,
    } = useHomeViewModel()

    return (
        <AppLayout>
            <div className="space-y-6">
                {isCoupleAccount && <CasalFamiliaToggle viewMode={viewMode} onChange={setViewMode} />}

                {loadingFamilyData ? (
                    <div className="rounded-2xl bg-card p-12 text-center border border-border/50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    </div>
                ) : (
                    <>
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
                            allTransactions={balanceData.allTransactions}
                            period={period}
                            onPeriodChange={setPeriod}
                        />

                        {/* Recent Transactions */}
                        <RecentTransactions transactions={balanceData.transactions} />

                        {/* Recent Transfers */}
                        <RecentTransfers transfers={balanceData.transfers} cards={cards} />
                    </>
                )}
            </div>
        </AppLayout>
    )
}
