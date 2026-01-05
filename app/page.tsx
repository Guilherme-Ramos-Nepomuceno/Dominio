"use client"

import { useState } from "react"
import { AppLayout } from "@/components/layout/app-layout"
import { CircularBalance } from "@/components/dashboard/circular-balance"
import { IncomeExpenseCards } from "@/components/dashboard/income-expense-cards"
import { RecentTransactions } from "@/components/dashboard/recent-transactions"
import { useTotalBalance } from "@/hooks/use-transactions"
import { getCurrentMonth } from "@/lib/date-utils"
import type { PeriodType } from "@/lib/types"
import { ArrowsLeftRight } from "@phosphor-icons/react"
import Link from "next/link"

export default function Home() {
  const [selectedMonth] = useState(getCurrentMonth())
  const [period, setPeriod] = useState<PeriodType>("week")
  const balanceData = useTotalBalance(selectedMonth)

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

        <div className="flex justify-center">
          <Link
            href="/transfer"
            className="flex items-center gap-2 px-4 py-2 rounded-[1vw] bg-primary text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <ArrowsLeftRight size={20} weight="bold" />
            Transferir
          </Link>
        </div>

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
