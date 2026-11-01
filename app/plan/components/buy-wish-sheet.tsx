"use client"

import { useEffect, useState } from "react"
import { CheckCircle, CircleNotch, Receipt } from "@phosphor-icons/react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { buyWish, getWishCandidates, type WishCandidate } from "@/lib/planning-api"
import { formatCurrency, formatDate } from "@/lib/date-utils"
import { formatMoneyInput, parseMoneyInput, type PlanWish } from "@/lib/plan"
import { todayLocalISODate } from "@/lib/quick-add"
import { trackEvent } from "@/lib/events"
import type { Card, PaymentMethod } from "@/lib/types"
import { toast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

interface BuyWishSheetProps {
  wish: PlanWish | null
  cards: Card[]
  onClose: () => void
  onBought: () => void
}

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"

// "Comprei": liga o desejo a uma transação que já existe (candidatas que o
// backend acha parecidas) ou lança a compra agora.
export function BuyWishSheet({ wish, cards, onClose, onBought }: BuyWishSheetProps) {
  const [candidates, setCandidates] = useState<WishCandidate[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [mode, setMode] = useState<"pick" | "new">("pick")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(todayLocalISODate())
  const [cardId, setCardId] = useState("")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!wish) return
    setCandidates(null)
    setSelected(null)
    setAmount(formatMoneyInput(wish.estimatedAmount))
    setDate(todayLocalISODate())
    setCardId("")
    setError(null)
    let cancelled = false
    getWishCandidates(wish.id)
      .then((list) => {
        if (cancelled) return
        setCandidates(list)
        setMode(list.length > 0 ? "pick" : "new")
      })
      .catch(() => {
        if (cancelled) return
        setCandidates([])
        setMode("new")
      })
    return () => {
      cancelled = true
    }
  }, [wish])

  const selectedCard = cards.find((c) => c.id === cardId)
  const isCombo = !!selectedCard?.hasCredit && !!selectedCard?.hasDebit

  const submit = async () => {
    if (!wish) return
    setError(null)
    let input: Parameters<typeof buyWish>[1]
    if (mode === "pick") {
      if (!selected) return setError("Escolha a transação da compra.")
      input = { transactionId: selected }
    } else {
      const value = parseMoneyInput(amount)
      if (value === null || value <= 0) return setError("Informe o valor pago.")
      input = {
        transaction: {
          amount: value,
          // Meio-dia local evita a data "voltar um dia" ao virar ISO/UTC.
          date: `${date}T12:00:00`,
          description: wish.name,
          ...(cardId ? { cardId } : {}),
          ...(isCombo ? { paymentMethod } : {}),
        },
      }
    }
    setIsSaving(true)
    try {
      await buyWish(wish.id, input)
      trackEvent("wish_bought", { linkedExisting: mode === "pick" })
      toast({ title: "Desejo realizado!", description: `${wish.name} foi marcado como comprado.`, variant: "success" })
      onBought()
      onClose()
    } catch (e: any) {
      setError(e?.message || "Não foi possível registrar a compra.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer open={!!wish} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-card md:max-w-md md:mx-auto rounded-t-3xl data-[vaul-drawer-direction=bottom]:max-h-[90vh]">
        <div className="overflow-y-auto px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
          <div>
            <DrawerTitle className="text-lg font-bold">Comprei {wish?.name}</DrawerTitle>
            <DrawerDescription className="text-xs">Ligue a uma transação já lançada ou registre a compra agora.</DrawerDescription>
          </div>

          <div className="grid grid-cols-2 bg-muted rounded-full p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode("pick")}
              className={cn("py-1.5 rounded-full transition-colors", mode === "pick" ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              Já lancei
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={cn("py-1.5 rounded-full transition-colors", mode === "new" ? "bg-card shadow-sm" : "text-muted-foreground")}
            >
              Lançar agora
            </button>
          </div>

          {mode === "pick" ? (
            candidates === null ? (
              <div className="flex justify-center py-6">
                <CircleNotch size={20} className="animate-spin text-muted-foreground" />
              </div>
            ) : candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma transação parecida encontrada. Use “Lançar agora”.
              </p>
            ) : (
              <ul className="space-y-2" role="radiogroup" aria-label="Transação da compra">
                {candidates.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected === c.id}
                      onClick={() => setSelected(c.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors",
                        selected === c.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                      )}
                    >
                      <Receipt size={18} className="text-muted-foreground shrink-0" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium truncate">{c.description}</span>
                        <span className="block text-xs text-muted-foreground">{formatDate(c.date)}</span>
                      </span>
                      <span className="text-sm font-bold tabular-nums">{formatCurrency(c.amount)}</span>
                      {selected === c.id && <CheckCircle size={18} weight="fill" className="text-primary shrink-0" />}
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="space-y-3">
              <div>
                <label htmlFor="buy-amount" className="block text-sm font-medium mb-1">
                  Valor pago
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
                  <input
                    id="buy-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`${inputClass} pl-12 tabular-nums`}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="buy-date" className="block text-sm font-medium mb-1">
                  Data
                </label>
                <input id="buy-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label htmlFor="buy-card" className="block text-sm font-medium mb-1">
                  Conta ou cartão <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <select id="buy-card" value={cardId} onChange={(e) => setCardId(e.target.value)} className={inputClass}>
                  <option value="">Não informar</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {isCombo && (
                <div className="grid grid-cols-2 gap-2">
                  {(["credit", "debit"] as const).map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={cn(
                        "py-2 rounded-xl border text-sm font-semibold",
                        paymentMethod === pm ? "border-primary bg-primary/5" : "border-border text-muted-foreground",
                      )}
                    >
                      {pm === "credit" ? "Crédito" : "Débito"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-expense">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border font-semibold">
              Cancelar
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl bg-primary text-background font-semibold disabled:opacity-50"
            >
              {isSaving ? "Salvando..." : "Confirmar compra"}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
