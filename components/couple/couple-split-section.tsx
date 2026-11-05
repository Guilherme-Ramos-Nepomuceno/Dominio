"use client"

import Link from "next/link"
import { CaretRight, CheckCircle, HandCoins } from "@phosphor-icons/react"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { SPLIT_MODE_LABEL } from "@/lib/couple-split"
import { SectionTitle } from "@/app/plan/components/plan-ui"
import { useAccount } from "@/components/account/account-context"
import { getCurrentUser } from "@/lib/auth"
import { useCoupleSplit, type CoupleSplitData } from "@/hooks/use-couple-split"

// Frase do acerto do mês, já descontado o que foi registrado como acertado.
function settlementLine(data: CoupleSplitData) {
  const { remaining, settled } = data.status
  if (remaining) {
    const reversed = settled && remaining.fromId === settled.toId
    return {
      tone: "due" as const,
      text: `${data.nameOf(remaining.fromId)} ${reversed ? "devolve" : "passa"} ${formatCurrency(remaining.amount)} para ${data.nameOf(remaining.toId)}`,
      detail: settled ? `Já acertado ${formatCurrency(settled.amount)} · ${reversed ? "o acerto diminuiu" : "falta a diferença"}` : null,
    }
  }
  if (settled) return { tone: "done" as const, text: "Tudo acertado", detail: `${formatCurrency(settled.amount)} já passados este mês` }
  return { tone: "done" as const, text: "Tudo certo, ninguém deve nada", detail: null }
}

// Só o acerto: a frase e o botão. Usado no Fechamento do casal.
export function CoupleSettlementLine({ monthKey }: { monthKey: string }) {
  const { isReadOnly } = useAccount()
  const { data, saving, markSettled } = useCoupleSplit(monthKey)
  if (!data) return null
  if (data.split.sharedTotal === 0) return <p className="text-sm text-muted-foreground">Nenhuma conta fixa do casal neste mês.</p>
  const line = settlementLine(data)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{line.text}</p>
        {line.detail && <p className="text-xs text-muted-foreground">{line.detail}</p>}
        <Link href="/" className="text-xs text-primary hover:underline">
          Ver a divisão
        </Link>
      </div>
      {line.tone === "due" && !isReadOnly && (
        <button
          type="button"
          onClick={markSettled}
          disabled={saving}
          className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Marcar como acertado"}
        </button>
      )}
    </div>
  )
}

// Se o acerto do mês já está em dia (para marcar o passo do Fechamento).
export function useCoupleSettled(monthKey: string, enabled: boolean): boolean {
  const { data } = useCoupleSplit(monthKey, enabled)
  return !data || !data.status.remaining
}

// Conta do casal: a divisão completa do mês — uma linha por pessoa (renda,
// parte, quanto já pagou, quanto fica livre) e o acerto.
export function CoupleSplitSection({ monthKey }: { monthKey: string }) {
  const { isReadOnly } = useAccount()
  const { data, loading, saving, markSettled } = useCoupleSplit(monthKey)
  if (!data) return null

  const { split } = data
  const line = settlementLine(data)

  return (
    <section aria-labelledby="couple-split" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <SectionTitle id="couple-split">Divisão do mês</SectionTitle>
        <Link href="/settings#divisao-casal" className="text-xs text-muted-foreground hover:text-foreground">
          {SPLIT_MODE_LABEL[data.mode]} · <span className="font-medium text-primary">Mudar</span>
        </Link>
      </div>

      {split.sharedTotal === 0 ? (
        <p className={cn("text-sm text-muted-foreground", loading && "opacity-60")}>
          Nenhuma conta fixa do casal neste mês. Marque como do casal as despesas que se repetem (aluguel, luz, internet) para dividir.
        </p>
      ) : (
        <div className={cn("space-y-4 transition-opacity", loading && "opacity-60")}>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold tabular-nums text-foreground">{formatCurrency(split.sharedTotal)}</span> em contas fixas do casal
          </p>

          <ul className="divide-y divide-border">
            {split.rows.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{data.nameOf(row.id)}</p>
                  <p className="text-xs text-muted-foreground">
                    Parte {formatCurrency(row.share)}
                    {split.sharedTotal > 0 && ` (${row.sharePct}%)`} · pagou {formatCurrency(row.paid)}
                    {row.scheduled > 0 && ` · ${formatCurrency(row.scheduled)} agendado`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Renda {data.incomeExpected[row.id] ? "prevista " : ""}
                    {formatCurrency(row.income)}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className={cn("text-sm font-semibold tabular-nums", row.free < 0 ? "text-expense" : "text-foreground")}>
                    {row.free < 0 ? `faltam ${formatCurrency(-row.free)}` : formatCurrency(row.free)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">livre</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 border-t border-border pt-3">
            {line.tone === "done" ? (
              <CheckCircle size={22} weight="duotone" className="shrink-0 text-income" />
            ) : (
              <HandCoins size={22} weight="duotone" className="shrink-0 text-primary" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{line.text}</p>
              {line.detail && <p className="text-xs text-muted-foreground">{line.detail}</p>}
            </div>
            {line.tone === "due" && !isReadOnly && (
              <button
                type="button"
                onClick={markSettled}
                disabled={saving}
                className="shrink-0 rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Marcar como acertado"}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

// Conta pessoal: uma linha com a parte de quem está olhando e o acerto; tocar
// abre a conta do casal.
export function CoupleSplitLine({ monthKey }: { monthKey: string }) {
  const { availableAccounts, selectAccount } = useAccount()
  const { data } = useCoupleSplit(monthKey)
  const me = getCurrentUser()?.id
  const coupleAccount = availableAccounts.find((a) => a.selection.type === "couple")
  if (!data || !me || data.split.sharedTotal === 0) return null

  const row = data.split.rows.find((r) => r.id === me)
  if (!row) return null
  const remaining = data.status.remaining
  const settle = !remaining ? "tudo acertado" : remaining.fromId === me ? `você passa ${formatCurrency(remaining.amount)}` : `você recebe ${formatCurrency(remaining.amount)}`

  return (
    <button
      type="button"
      onClick={() => coupleAccount && selectAccount(coupleAccount.selection)}
      className="flex w-full items-center gap-3 border-y border-border py-3 text-left hover:opacity-80 transition-opacity"
    >
      <HandCoins size={22} weight="duotone" className="shrink-0 text-muted-foreground" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-foreground">Contas do casal</span>
        <span className="block text-xs text-muted-foreground truncate">
          Sua parte {formatCurrency(row.share)} · {settle}
        </span>
      </span>
      <CaretRight size={14} weight="bold" className="shrink-0 text-muted-foreground" />
    </button>
  )
}
