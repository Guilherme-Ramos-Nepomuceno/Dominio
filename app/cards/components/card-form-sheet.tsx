"use client"

import type React from "react"
import { useState } from "react"
import type { BankName, Card, CardKind } from "@/lib/types"
import { bankColors, bankLogos, getBankIcon } from "@/lib/bank-icons"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { Chip, ChipRow, FieldLabel } from "@/components/transaction-inputs/transaction-inputs"
import { FormSheet, SheetPrimaryButton, UnderlineInput } from "@/components/ui/form-sheet"

export type CardFormValues = Pick<Card, "name" | "lastDigits" | "bankName" | "hasCredit" | "hasDebit" | "kind" | "color" | "limit" | "dueDate" | "closingDate">

const KIND_OPTIONS: { value: CardKind; label: string }[] = [
  { value: "card", label: "Cartão" },
  { value: "checking", label: "Conta corrente" },
  { value: "savings", label: "Poupança" },
]

const BANKS: BankName[] = ["nubank", "inter", "itau", "bradesco", "santander", "caixa", "bb", "alelo", "other"]

const dayInput =
  "w-10 border-b border-border bg-transparent py-0.5 text-center text-sm font-semibold tabular-nums text-foreground focus:border-foreground focus:outline-none"

// Criar/editar cartão ou conta: prévia com o ícone do banco, banco em pílulas,
// e os campos de crédito (limite, fechamento, vencimento) só quando há crédito.
export function CardFormSheet({
  mode,
  initial,
  onSubmit,
  onClose,
}: {
  mode: "new" | "edit"
  initial?: Partial<Card>
  onSubmit: (values: CardFormValues) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [lastDigits, setLastDigits] = useState(initial?.lastDigits === "0000" ? "" : (initial?.lastDigits ?? ""))
  const [bankName, setBankName] = useState<BankName>(initial?.bankName ?? "nubank")
  const [kind, setKind] = useState<CardKind>(initial?.kind ?? "card")
  // Contas (corrente/poupança) são sempre só débito — sem linha de crédito própria.
  const [hasCredit, setHasCredit] = useState(initial?.hasCredit ?? true)
  const [hasDebit, setHasDebit] = useState(initial?.hasDebit ?? false)
  const [limit, setLimit] = useState(initial?.limit ? formatCurrencyInput(Math.round(initial.limit * 100).toString()) : "")
  const [dueDate, setDueDate] = useState(initial?.dueDate ? String(initial.dueDate) : "10")
  const [closingDate, setClosingDate] = useState(initial?.closingDate ? String(initial.closingDate) : "3")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAccount = kind !== "card"
  const BankIcon = getBankIcon(bankName)

  const changeKind = (value: CardKind) => {
    setKind(value)
    if (value !== "card") {
      setHasCredit(false)
      setHasDebit(true)
    } else if (!hasCredit && !hasDebit) {
      setHasCredit(true)
    }
  }

  // Precisa ficar pelo menos um marcado.
  const toggleCredit = () => (hasCredit && !hasDebit ? undefined : setHasCredit((v) => !v))
  const toggleDebit = () => (hasDebit && !hasCredit ? undefined : setHasDebit((v) => !v))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return
    if (!name.trim()) {
      setError(isAccount ? "Dê um nome para a conta." : "Dê um nome para o cartão.")
      return
    }
    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        lastDigits: lastDigits || "0000",
        bankName,
        hasCredit,
        hasDebit,
        kind,
        color: bankColors[bankName],
        limit: hasCredit ? (limit ? parseCurrencyInput(limit) : undefined) : undefined,
        dueDate: hasCredit ? Number.parseInt(dueDate) : undefined,
        closingDate: hasCredit ? Number.parseInt(closingDate) : undefined,
      })
      onClose()
    } catch (err: any) {
      setError(err?.message || "Não foi possível salvar. Tente de novo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const noun = isAccount ? "conta" : "cartão"

  return (
    <FormSheet
      title={mode === "new" ? "Novo cartão ou conta" : `Editar ${noun}`}
      onClose={onClose}
      onSubmit={handleSubmit}
      footer={
        <SheetPrimaryButton disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : mode === "new" ? `Adicionar ${noun}` : "Salvar"}
        </SheetPrimaryButton>
      }
    >
      {/* Prévia + nome */}
      <div className="flex items-center gap-3">
        <BankIcon size={30} weight="fill" color={bankColors[bankName]} className="shrink-0 transition-colors" aria-hidden />
        <label className="flex-1 min-w-0">
          <span className="sr-only">Nome</span>
          <UnderlineInput
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError(null)
            }}
            placeholder={isAccount ? "Ex: Conta do Itaú" : "Ex: Nubank Roxinho"}
            maxLength={40}
            autoFocus={mode === "new"}
            className="text-xl font-semibold"
          />
        </label>
      </div>
      {error && <p className="-mt-6 text-xs text-expense">{error}</p>}

      <div className="space-y-3">
        <FieldLabel>O que é</FieldLabel>
        <ChipRow wrap>
          {KIND_OPTIONS.map((option) => (
            <Chip key={option.value} selected={kind === option.value} onClick={() => changeKind(option.value)}>
              {option.label}
            </Chip>
          ))}
        </ChipRow>
      </div>

      <div className="space-y-3">
        <FieldLabel>Banco</FieldLabel>
        <ChipRow wrap>
          {BANKS.map((bank) => {
            const Icon = getBankIcon(bank)
            const selected = bankName === bank
            return (
              <Chip key={bank} selected={selected} onClick={() => setBankName(bank)}>
                <Icon size={14} weight="fill" color={selected ? undefined : bankColors[bank]} />
                {bankLogos[bank]}
              </Chip>
            )
          })}
        </ChipRow>
      </div>

      <label className="block space-y-2">
        <FieldLabel hint="Opcional, ajuda a reconhecer">{isAccount ? "Final da conta" : "Final do cartão"}</FieldLabel>
        <UnderlineInput
          inputMode="numeric"
          value={lastDigits}
          onChange={(e) => setLastDigits(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="1234"
          maxLength={4}
          className="w-24 tabular-nums tracking-widest"
        />
      </label>

      {kind === "card" && (
        <div className="space-y-3">
          <FieldLabel hint={hasCredit && hasDebit ? "Ao lançar, você escolhe qual dos dois" : undefined}>Funciona no</FieldLabel>
          <ChipRow wrap>
            <Chip selected={hasCredit} onClick={toggleCredit}>
              Crédito
            </Chip>
            <Chip selected={hasDebit} onClick={toggleDebit}>
              Débito
            </Chip>
          </ChipRow>
        </div>
      )}

      {hasCredit && (
        <div className="space-y-6">
          <label className="block space-y-2">
            <FieldLabel hint="Opcional">Limite</FieldLabel>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-muted-foreground">R$</span>
              <UnderlineInput
                inputMode="decimal"
                value={limit}
                onChange={(e) => setLimit(formatCurrencyInput(e.target.value.replace(/\D/g, "")))}
                placeholder="0,00"
                className="text-lg font-semibold tabular-nums"
              />
            </div>
          </label>

          <div className="space-y-2">
            <FieldLabel>Fatura</FieldLabel>
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-foreground">
              Fecha dia
              <input type="number" min={1} max={31} value={closingDate} onChange={(e) => setClosingDate(e.target.value)} aria-label="Dia de fechamento" className={dayInput} />
              e vence dia
              <input type="number" min={1} max={31} value={dueDate} onChange={(e) => setDueDate(e.target.value)} aria-label="Dia de vencimento" className={dayInput} />
            </p>
            <p className="text-xs text-muted-foreground">
              Compras a partir do dia {closingDate || "—"} entram na fatura seguinte.
            </p>
          </div>
        </div>
      )}
    </FormSheet>
  )
}
