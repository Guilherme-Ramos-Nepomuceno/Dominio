"use client"

import { useEffect, useState } from "react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { formatMoneyInput, parseMoneyInput, type PlanWish } from "@/lib/plan"
import type { WishInput } from "@/lib/planning-api"
import type { Category } from "@/lib/types"

interface WishFormSheetProps {
  // null = fechado; "new" = novo desejo.
  wish: PlanWish | "new" | null
  categories: Category[]
  canMarkCasal: boolean
  onClose: () => void
  onSave: (input: WishInput, existing: PlanWish | null) => Promise<boolean>
}

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"

export function WishFormSheet({ wish, categories, canMarkCasal, onClose, onSave }: WishFormSheetProps) {
  const existing = wish && wish !== "new" ? wish : null
  const [name, setName] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [link, setLink] = useState("")
  const [isCasal, setIsCasal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!wish) return
    setName(existing?.name ?? "")
    setAmount(existing ? formatMoneyInput(existing.estimatedAmount) : "")
    setCategoryId(existing?.categoryId ?? "")
    setLink(existing?.link ?? "")
    setIsCasal(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wish])

  const submit = async () => {
    const value = parseMoneyInput(amount)
    if (!name.trim()) return setError("Dê um nome ao desejo.")
    if (value === null || value <= 0) return setError("Informe quanto deve custar.")
    const trimmedLink = link.trim()
    if (trimmedLink && !/^https?:\/\//i.test(trimmedLink)) return setError("O link precisa começar com http:// ou https://")
    setError(null)
    setIsSaving(true)
    const ok = await onSave(
      {
        name: name.trim(),
        estimatedAmount: value,
        categoryId: categoryId || null,
        link: trimmedLink || null,
        ...(canMarkCasal && !existing && isCasal ? { isCasal: true } : {}),
      },
      existing,
    )
    setIsSaving(false)
    if (ok) onClose()
  }

  return (
    <Drawer open={!!wish} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-card md:max-w-md md:mx-auto rounded-t-3xl">
        <form
          className="overflow-y-auto px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div>
            <DrawerTitle className="text-lg font-bold">{existing ? "Editar desejo" : "Novo desejo"}</DrawerTitle>
            <DrawerDescription className="text-xs">Anote o que você quer e veja se cabe na margem do mês.</DrawerDescription>
          </div>

          <div>
            <label htmlFor="wish-name" className="block text-sm font-medium mb-1">
              O que é
            </label>
            <input id="wish-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Tênis de corrida" className={inputClass} />
          </div>

          <div>
            <label htmlFor="wish-amount" className="block text-sm font-medium mb-1">
              Quanto custa (estimado)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
              <input
                id="wish-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className={`${inputClass} pl-12 tabular-nums`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="wish-category" className="block text-sm font-medium mb-1">
              Categoria <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <select id="wish-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">Sem categoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="wish-link" className="block text-sm font-medium mb-1">
              Link <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <input
              id="wish-link"
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://"
              className={inputClass}
            />
          </div>

          {canMarkCasal && !existing && (
            <label className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border cursor-pointer">
              <input type="checkbox" checked={isCasal} onChange={(e) => setIsCasal(e.target.checked)} className="w-4 h-4 accent-current" />
              <span className="text-sm">
                <span className="font-medium">Do casal</span>
                <span className="block text-xs text-muted-foreground">Vai para o plano da conta do casal.</span>
              </span>
            </label>
          )}

          {error && <p className="text-sm text-expense">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border font-semibold">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl bg-primary text-background font-semibold disabled:opacity-50"
            >
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
