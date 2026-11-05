"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { CalendarBlank, CaretRight } from "@phosphor-icons/react"
import { getCards, getPendingTransactions } from "@/lib/storage"
import { formatCurrency } from "@/lib/date-utils"
import { formatWeekday } from "@/lib/week"
import { dayKey, upcomingDayLabel, upcomingOutflows } from "@/lib/home"
import type { Transaction } from "@/lib/types"

// Daqui pra frente, logo abaixo do herói: uma linha com o total agendado
// para sair até o fim da semana (contas, recorrentes, parcelas) — o detalhe
// fica em Pendentes e o aviso de cada conta no sininho. Sem nada até lá, diz
// quando é a próxima. Compra no crédito fica de fora: ela vai para a fatura,
// como na tela de Pendentes.
// "sábado" (só o nome do dia; a data completa já está no herói).
function weekdayName(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", { weekday: "long" }).split("-")[0]
}

export function HomeUpcoming({ todayISO, weekEnd }: { todayISO: string; weekEnd: string }) {
  const [pending, setPending] = useState<Transaction[] | null>(null)

  const load = useCallback(async () => {
    try {
      const [items, cards] = await Promise.all([getPendingTransactions(), getCards()])
      setPending(
        items.filter((t) => {
          const card = t.cardId ? cards.find((c) => c.id === t.cardId) : undefined
          if (card?.hasCredit && (!card.hasDebit || t.paymentMethod === "credit")) return false
          return true
        }),
      )
    } catch (error) {
      console.error("Falha ao carregar as pendências na Home:", error)
      setPending([])
    }
  }, [])

  useEffect(() => {
    load()
    window.addEventListener("storage-update", load)
    return () => window.removeEventListener("storage-update", load)
  }, [load])

  if (!pending) return null
  const { within, next } = upcomingOutflows(pending, todayISO, weekEnd.slice(0, 10))

  if (within.length === 0) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <CalendarBlank size={16} weight="duotone" className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Nada agendado até {formatWeekday(weekEnd)}.
          {next && (
            <>
              {" "}
              Próxima conta: <span className="text-foreground">{next.description}</span>{" "}
              <span className="tabular-nums">{formatCurrency(next.amount)}</span>, {upcomingDayLabel(dayKey(next.date), todayISO)}.
            </>
          )}
        </span>
      </p>
    )
  }

  const total = within.reduce((sum, t) => sum + t.amount, 0)
  return (
    <Link
      href="/pending"
      className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <CalendarBlank size={16} weight="duotone" className="shrink-0" aria-hidden />
      <span className="flex-1 min-w-0">
        <span className="font-semibold tabular-nums text-foreground">{formatCurrency(total)}</span> em{" "}
        {within.length === 1 ? "1 conta" : `${within.length} contas`} até {weekdayName(weekEnd)}
      </span>
      <CaretRight size={12} weight="bold" className="shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  )
}
