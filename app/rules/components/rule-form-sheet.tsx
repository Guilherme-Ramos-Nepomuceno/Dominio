"use client"

import { useEffect, useState } from "react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { formatMoneyInput, parseMoneyInput } from "@/lib/plan"
import type { CategoryRule, RuleFormInput } from "@/lib/rules"
import type { Category } from "@/lib/types"
import { AppSelect } from "@/components/ui/app-select"

interface RuleFormSheetProps {
  rule: CategoryRule | "new" | null
  categories: Category[]
  onClose: () => void
  // Devolve a mensagem de erro (ou null quando salvou).
  onSave: (input: RuleFormInput, existing: CategoryRule | null) => Promise<string | null>
}

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"

export function RuleFormSheet({ rule, categories, onClose, onSave }: RuleFormSheetProps) {
  const existing = rule && rule !== "new" ? rule : null
  const [description, setDescription] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [maxAmount, setMaxAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!rule) return
    setDescription(existing?.merchantKey ?? "")
    setCategoryId(existing?.categoryId ?? "")
    setMinAmount(existing?.minAmount != null ? formatMoneyInput(existing.minAmount) : "")
    setMaxAmount(existing?.maxAmount != null ? formatMoneyInput(existing.maxAmount) : "")
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule])

  const submit = async () => {
    const min = minAmount.trim() ? parseMoneyInput(minAmount) : null
    const max = maxAmount.trim() ? parseMoneyInput(maxAmount) : null
    if ((minAmount.trim() && min === null) || (maxAmount.trim() && max === null)) {
      setError("Valor inválido na faixa.")
      return
    }
    setIsSaving(true)
    const message = await onSave({ description, categoryId, minAmount: min, maxAmount: max }, existing)
    setIsSaving(false)
    if (message) setError(message)
    else onClose()
  }

  const expense = categories.filter((c) => c.type === "expense")
  const income = categories.filter((c) => c.type === "income")

  return (
    <Drawer open={!!rule} onOpenChange={(open) => !open && onClose()}>
      <DrawerContent className="bg-card md:max-w-md md:mx-auto rounded-t-3xl">
        <form
          className="overflow-y-auto px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div>
            <DrawerTitle className="text-lg font-bold">{existing ? "Editar regra" : "Nova regra"}</DrawerTitle>
            <DrawerDescription className="text-xs">
              Lançamentos desse estabelecimento entram direto na categoria escolhida.
            </DrawerDescription>
          </div>

          <div>
            <label htmlFor="rule-description" className="block text-sm font-medium mb-1">
              Descrição ou estabelecimento
            </label>
            <input
              id="rule-description"
              value={description}
              disabled={!!existing}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex.: Padaria do Zé, UBER, iFood"
              className={`${inputClass} disabled:opacity-60`}
            />
            {existing && <p className="mt-1 text-[11px] text-muted-foreground">Para outro estabelecimento, crie uma nova regra.</p>}
          </div>

          <div>
            <label htmlFor="rule-category" className="block text-sm font-medium mb-1">
              Categoria
            </label>
            <AppSelect
              id="rule-category"
              value={categoryId}
              onChange={setCategoryId}
              placeholder="Escolha a categoria"
              options={[
                ...expense.map((c) => ({ value: c.id, label: c.name, group: "Despesas" })),
                ...income.map((c) => ({ value: c.id, label: c.name, group: "Receitas" })),
              ]}
            />
          </div>

          <fieldset>
            <legend className="block text-sm font-medium mb-1">
              Faixa de valor <span className="text-muted-foreground font-normal">(opcional)</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">de R$</span>
                <input
                  inputMode="decimal"
                  aria-label="Valor mínimo"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className={`${inputClass} pl-14 tabular-nums`}
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">até R$</span>
                <input
                  inputMode="decimal"
                  aria-label="Valor máximo"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className={`${inputClass} pl-16 tabular-nums`}
                />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Útil quando o mesmo lugar tem gastos diferentes (ex.: posto: até R$ 30 é lanche, acima é combustível).
            </p>
          </fieldset>

          {error && <p className="text-sm text-expense">{error}</p>}

          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-border font-semibold">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="flex-1 py-3 rounded-xl bg-primary text-background font-semibold disabled:opacity-50">
              {isSaving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
