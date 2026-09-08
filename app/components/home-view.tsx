"use client"

import { AppLayout } from "@/components/layout/app-layout"
import { CircularBalance } from "./circular-balance"
import { IncomeExpenseCards } from "./income-expense-cards"
import { RecentTransactions } from "./recent-transactions"
import { RecentTransfers } from "./recent-transfers"
import { CasalFamiliaToggle } from "./casal-familia-toggle"
import { SkeletonCircularBalance } from "@/components/ui/loading-skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { useHomeViewModel } from "../hooks/use-home-view-model"

export function HomeView() {
    const {
        period,
        setPeriod,
        balanceData,
        viewMode,
        setViewMode,
        isCoupleAccount,
        isLoading,
        cards,
    } = useHomeViewModel()

    return (
        <AppLayout>
            <div className="space-y-6">
                {isCoupleAccount && <CasalFamiliaToggle viewMode={viewMode} onChange={setViewMode} />}

                {isLoading ? (
                    <div className="space-y-6">
                        <SkeletonCircularBalance />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Skeleton className="h-32 rounded-2xl" />
                            <Skeleton className="h-32 rounded-2xl" />
                        </div>
                        <Skeleton className="h-48 rounded-2xl" />
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
