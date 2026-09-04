"use client"

import { useEffect, useState } from "react"
import { X, TagIcon, Heart } from "@phosphor-icons/react"
import * as PhosphorIcons from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { formatCurrencyInput, parseCurrencyInput } from "@/lib/date-utils"
import { getCategories, updateTransaction } from "@/lib/storage"
import type { Category, Transaction } from "@/lib/types"
import { useToast } from "@/hooks/use-toast"
import { useAccount } from "@/components/account/account-context"

interface EditTransactionDialogProps {
  transaction: Transaction | null
  onClose: () => void
  onSaved: () => void
}

export function EditTransactionDialog({ transaction, onClose, onSaved }: EditTransactionDialogProps) {
  const { toast } = useToast()
  const { family } = useAccount()
  const hasCoupleAccount = !!family?.members?.some((m) => m.accountType === "COUPLE")
  const [categories, setCategories] = useState<Category[]>([])
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [categoryId, setCategoryId] = useState("")
  const [date, setDate] = useState("")
  const [isCasal, setIsCasal] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!transaction) return
    getCategories().then(setCategories)
    setDescription(transaction.description)
    setAmount(formatCurrencyInput(Math.round(transaction.amount * 100).toString()))
    setCategoryId(transaction.categoryId)
    setDate(transaction.date.split("T")[0])
    setIsCasal(!!transaction.isCasal)
  }, [transaction])

  if (!transaction) return null

  const filteredCategories = categories.filter((c) => c.type === transaction.type)

  const handleAmountChange = (value: string) => {
    const onlyNumbers = value.replace(/\D/g, "")
    setAmount(formatCurrencyInput(onlyNumbers))
  }

  const handleSubmit = async () => {
    const numAmount = parseCurrencyInput(amount)
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0 || !categoryId || !date) {
      toast({ title: "Erro", description: "Preencha todos os campos corretamente.", variant: "destructive" })
      return
    }

    const [year, month, day] = date.split("-").map(Number)
    const dateObj = new Date(year, month - 1, day, 12, 0, 0)

    setIsSaving(true)
    try {
      await updateTransaction(transaction.id, {
        description: description.trim(),
        amount: numAmount,
        categoryId,
        date: dateObj.toISOString(),
        isCasal: transaction.type === "expense" ? isCasal : undefined,
      })
      toast({ title: "Transação atualizada!", variant: "success" })
      onSaved()
      onClose()
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message || "Não foi possível atualizar a transação.", variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Editar Transação</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <TagIcon size={16} weight="bold" />
            Descrição
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Amount */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Valor</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">R$</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-[1vw] bg-background border border-border text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Categoria</label>
          <div className="grid grid-cols-2 gap-3">
            {filteredCategories.map((category) => {
              const CategoryIcon = (category.icon && PhosphorIcons[category.icon as keyof typeof PhosphorIcons]) || PhosphorIcons.Circle
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-[1vw] border transition-all",
                    categoryId === category.id
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 hover:bg-black/4 dark:hover:bg-white/6",
                  )}
                >
                  <div className="w-10 h-10 flex items-center justify-center shrink-0 text-muted-foreground">
                    {/* @ts-ignore - Dynamic icon component */}
                    <CategoryIcon size={22} weight="duotone" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{category.name}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Data</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Tag "do casal" — só para despesas */}
        {transaction.type === "expense" && hasCoupleAccount && (
          <button
            type="button"
            onClick={() => setIsCasal(!isCasal)}
            className={cn(
              "w-full flex items-center gap-3 p-4 rounded-[1vw] border transition-all text-left",
              isCasal
                ? "border-primary bg-primary/10"
                : "border-black/10 dark:border-white/10 bg-black/2 dark:bg-white/3 hover:bg-black/4 dark:hover:bg-white/6",
            )}
          >
            <div className={cn("w-10 h-10 flex items-center justify-center shrink-0 rounded-lg", isCasal ? "text-primary" : "text-muted-foreground")}>
              <Heart size={22} weight={isCasal ? "fill" : "duotone"} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Despesa do casal</p>
              <p className="text-xs text-muted-foreground">Aparece também na conta do casal, mesmo paga por um cartão pessoal</p>
            </div>
            <div className={cn("w-11 h-6 rounded-full transition-colors shrink-0 relative", isCasal ? "bg-primary" : "bg-muted")}>
              <div className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all", isCasal ? "left-5" : "left-0.5")} />
            </div>
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-[1vw] border border-border text-foreground font-semibold hover:bg-muted transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 py-3 px-4 rounded-[1vw] bg-primary text-background font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isSaving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </div>
  )
}
