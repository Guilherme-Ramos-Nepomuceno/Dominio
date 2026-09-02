"use client"

import Link from "next/link"
import { Warning, CaretRight } from "@phosphor-icons/react"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import type { Transaction } from "@/lib/types"

interface PendingAlertProps {
  items: Transaction[]
  total: number
  count: number
  loading: boolean
}

export function PendingAlert({ items, total, count, loading }: PendingAlertProps) {
  if (loading || count === 0) return null

  const preview = items.slice(0, 3)

  return (
    <Link
      href="/pending"
      className="block rounded-[20px] bg-warning/10 border border-warning/30 p-4 hover:bg-warning/15 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
            <Warning size={20} weight="bold" className="text-warning" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground text-sm">
              {count === 1 ? "1 pendência em aberto" : `${count} pendências em aberto`}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {preview.map((t) => t.description).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="font-bold text-warning">{formatCurrency(total)}</span>
          <CaretRight size={16} className="text-warning" />
        </div>
      </div>
    </Link>
  )
}
