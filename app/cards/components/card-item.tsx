"use client"

import Link from "next/link"
import { ArrowsLeftRight, CaretRight, DotsThreeVertical, PencilSimple, PiggyBank, Trash, UploadSimple } from "@phosphor-icons/react"
import type { Card, SavingsGoal } from "@/lib/types"
import { getBankIcon } from "@/lib/bank-icons"
import { formatCurrency } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface CardActions {
  onDelete?: (id: string) => void
  onEdit?: (card: Card) => void
  onMerge?: (card: Card) => void
  onImport?: (card: Card) => void
}

// Final do cartão só quando existe (conta de dinheiro vem com 0000).
function digits(card: Card) {
  return card.lastDigits && card.lastDigits !== "0000" ? card.lastDigits : null
}

function CardMenu({ card, onDelete, onEdit, onMerge, onImport }: CardActions & { card: Card }) {
  if (!onEdit && !onDelete && !onMerge && !onImport) return null
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Mais ações de ${card.name}`} className="p-1.5 -mr-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <DotsThreeVertical size={18} weight="bold" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onSelect={() => onEdit(card)}>
            <PencilSimple size={14} /> Editar
          </DropdownMenuItem>
        )}
        {onImport && card.bankName !== "cash" && (
          <DropdownMenuItem onSelect={() => onImport(card)}>
            <UploadSimple size={14} /> Importar extrato
          </DropdownMenuItem>
        )}
        {onMerge && (
          <DropdownMenuItem onSelect={() => onMerge(card)}>
            <ArrowsLeftRight size={14} /> Juntar com outro
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onDelete(card.id)} className="text-expense focus:text-expense">
              <Trash size={14} /> Excluir
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// "2026-11-16" → "16/11" (data pura do banco, sem passar por Date/fuso).
function dayMonth(isoDate: string) {
  const [, month, day] = isoDate.split("-")
  return `${day}/${month}`
}

// Cartão de crédito: o que está devido à direita e o limite usado numa barra
// fina. Vinculado ao banco, tudo (devido, limite, disponível, datas) é o que o
// banco informa. Tocar abre as faturas do cartão.
export function CreditCardRow({ card, invoice, actions }: { card: Card; invoice: number; actions: CardActions }) {
  const BankIcon = getBankIcon(card.bankName)
  const bank = card.bank?.credit ?? null
  const limit = bank?.limit ?? card.limit ?? 0
  const used = limit > 0 ? Math.min(1, Math.max(0, invoice / limit)) : 0
  const free = bank?.available ?? limit - invoice
  const final = digits(card)
  const due = bank?.dueDate ? `vence ${dayMonth(bank.dueDate)}` : card.dueDate && `vence ${card.dueDate}`
  const dates = [card.closingDate && `fecha ${card.closingDate}`, due].filter(Boolean).join(" · ")
  const title = limit > 0 ? `Limite de ${formatCurrency(limit)}${bank ? " · informado pelo banco" : ""}` : undefined

  return (
    <li className="flex items-start gap-3 py-4">
      <BankIcon size={22} weight="fill" color={card.color} className="mt-0.5 shrink-0" aria-hidden />
      <Link href={`/invoices?card=${card.id}`} className="flex-1 min-w-0 space-y-2 group" title={title}>
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-foreground truncate">
            {card.name}
            {final && <span className="ml-1.5 text-xs font-normal tabular-nums text-muted-foreground">{final}</span>}
          </p>
          <p className="flex items-center gap-0.5 text-sm font-semibold tabular-nums text-foreground shrink-0">
            {formatCurrency(invoice)}
            <CaretRight size={12} weight="bold" className="text-muted-foreground group-hover:text-foreground" />
          </p>
        </div>
        {limit > 0 && (
          <div className="h-1 rounded-full bg-(--plan-track) overflow-hidden" aria-hidden>
            <div
              className={cn("h-full rounded-full", used >= 0.9 ? "bg-expense" : "bg-foreground/70")}
              style={{ width: `${used * 100}%` }}
            />
          </div>
        )}
        <div className="flex items-baseline justify-between gap-3 text-xs text-muted-foreground">
          <span>
            {limit > 0 ? (
              <>
                <span className={cn(free < 0 && "text-expense")}>{formatCurrency(free)}</span> {bank ? "disponíveis" : "livres"}
              </>
            ) : (
              "Sem limite cadastrado"
            )}
          </span>
          {dates && <span className="shrink-0">{dates}</span>}
        </div>
      </Link>
      <CardMenu card={card} {...actions} />
    </li>
  )
}

// Conta (débito/corrente/dinheiro): saldo à direita, gasto do mês e reservas abaixo.
export function AccountRow({
  card,
  balance,
  spent,
  savingsGoals,
  actions,
}: {
  card: Card
  balance: number
  spent: number
  savingsGoals: SavingsGoal[]
  actions: CardActions
}) {
  const BankIcon = getBankIcon(card.bankName)
  const final = digits(card)
  const reserved = savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0)

  return (
    <li className="flex items-start gap-3 py-4">
      <BankIcon size={22} weight="fill" color={card.color} className="mt-0.5 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-medium text-foreground truncate">
            {card.name}
            {final && <span className="ml-1.5 text-xs font-normal tabular-nums text-muted-foreground">{final}</span>}
          </p>
          <p className={cn("text-sm font-semibold tabular-nums shrink-0", balance < 0 ? "text-expense" : "text-foreground")}>{formatCurrency(balance)}</p>
        </div>
        <p className="text-xs text-muted-foreground">{spent > 0 ? `${formatCurrency(spent)} gastos este mês` : "Nada gasto este mês"}</p>
        {reserved > 0 && (
          <Link href="/savings" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <PiggyBank size={12} weight="duotone" />
            {formatCurrency(reserved)} em {savingsGoals.length === 1 ? savingsGoals[0].name : `${savingsGoals.length} reservas`}
          </Link>
        )}
      </div>
      <CardMenu card={card} {...actions} />
    </li>
  )
}
