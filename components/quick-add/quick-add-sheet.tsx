"use client"

import type React from "react"
import * as PhosphorIcons from "@phosphor-icons/react"
import { ArrowDownIcon, ArrowUpIcon, BackspaceIcon, CalendarIcon, SparkleIcon, WalletIcon } from "@phosphor-icons/react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { formatCentsBRL, type KeypadKey } from "@/lib/quick-add"
import type { QuickAddViewModel } from "./use-quick-add-view-model"

const KEYPAD: KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "backspace"]

// Registro rápido: valor no teclado numérico grande + confirmação já é o
// registro completo. Descrição, conta, data e categoria são opcionais e ficam
// na mesma tela (sem abrir outra). "Mais opções" leva ao formulário completo.
export function QuickAddSheet({ vm }: { vm: QuickAddViewModel }) {
  const isIncome = vm.type === "income"

  // Teclado físico (desktop): dígitos, Backspace e Enter funcionam fora dos
  // campos de texto/data.
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    if (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA") return
    if (/^[0-9]$/.test(e.key)) {
      vm.pressKey(e.key as KeypadKey)
      e.preventDefault()
    } else if (e.key === "Backspace") {
      vm.pressKey("backspace")
      e.preventDefault()
    } else if (e.key === "Enter" && vm.canSave) {
      vm.save()
      e.preventDefault()
    }
  }

  return (
    <Drawer open={vm.open} onOpenChange={vm.setOpen}>
      <DrawerContent
        onKeyDown={handleKeyDown}
        className="bg-card md:max-w-md md:mx-auto data-[vaul-drawer-direction=bottom]:max-h-[94vh] rounded-t-3xl"
      >
        <div className="overflow-y-auto px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DrawerTitle className="text-lg font-bold">Registro rápido</DrawerTitle>
              <DrawerDescription className="text-xs">Só o valor já basta — o resto é opcional.</DrawerDescription>
            </div>
            {/* Alternância despesa/receita */}
            <div className="grid grid-cols-2 bg-muted rounded-full p-1 text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => vm.changeType("expense")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors",
                  !isIncome ? "bg-expense text-white shadow-sm" : "text-muted-foreground",
                )}
              >
                <ArrowDownIcon size={12} weight="bold" />
                Despesa
              </button>
              <button
                type="button"
                onClick={() => vm.changeType("income")}
                className={cn(
                  "flex items-center gap-1 px-3 py-1.5 rounded-full transition-colors",
                  isIncome ? "bg-income text-white shadow-sm" : "text-muted-foreground",
                )}
              >
                <ArrowUpIcon size={12} weight="bold" />
                Receita
              </button>
            </div>
          </div>

          {/* Valor */}
          <p
            className={cn(
              "text-center text-4xl font-bold tabular-nums tracking-tight py-1",
              vm.cents === 0 ? "text-muted-foreground" : isIncome ? "text-income" : "text-expense",
            )}
            aria-live="polite"
          >
            {formatCentsBRL(vm.cents)}
          </p>

          {/* Descrição */}
          <input
            type="text"
            value={vm.description}
            onChange={(e) => vm.setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            maxLength={120}
            className="w-full px-4 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Chips de categoria: toque categoriza, outro toque desmarca */}
          {vm.chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {vm.chips.map((category) => {
                const Icon = (category.icon && (PhosphorIcons as any)[category.icon]) || PhosphorIcons.Circle
                const selected = vm.categoryId === category.id
                const suggested = vm.suggestedCategoryId === category.id
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => vm.tapChip(category.id)}
                    aria-pressed={selected}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-colors",
                      selected
                        ? "border-primary bg-primary text-background"
                        : "border-border bg-background text-foreground hover:bg-muted",
                    )}
                  >
                    <Icon size={14} weight="duotone" />
                    {category.name}
                    {suggested && !selected && <SparkleIcon size={12} weight="fill" className="text-primary/70" aria-label="sugestão" />}
                  </button>
                )
              })}
            </div>
          )}

          {/* Conta + data */}
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border text-xs min-w-0">
              <WalletIcon size={14} weight="bold" className="text-muted-foreground shrink-0" />
              <span className="sr-only">Conta</span>
              <select
                value={vm.cardId ?? ""}
                onChange={(e) => vm.setCardId(e.target.value || null)}
                className="flex-1 min-w-0 bg-transparent text-foreground focus:outline-none truncate"
              >
                <option value="">Sem conta</option>
                {vm.availableCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background border border-border text-xs min-w-0">
              <CalendarIcon size={14} weight="bold" className="text-muted-foreground shrink-0" />
              <span className="sr-only">Data</span>
              <input
                type="date"
                value={vm.date}
                onChange={(e) => e.target.value && vm.setDate(e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-foreground focus:outline-none"
              />
            </label>
          </div>

          {/* Cartão combinado: crédito ou débito */}
          {vm.isComboCard && (
            <div className="grid grid-cols-2 gap-2 text-xs font-medium">
              {(["credit", "debit"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => vm.setPaymentMethod(method)}
                  className={cn(
                    "py-2 rounded-xl border transition-colors",
                    vm.paymentMethod === method ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  {method === "credit" ? "Crédito" : "Débito"}
                </button>
              ))}
            </div>
          )}

          {/* Teclado numérico */}
          <div className="grid grid-cols-3 gap-2 select-none">
            {KEYPAD.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => vm.pressKey(key)}
                onContextMenu={(e) => {
                  // Segurar o apagar limpa tudo.
                  if (key === "backspace") {
                    e.preventDefault()
                    vm.pressKey("clear")
                  }
                }}
                aria-label={key === "backspace" ? "Apagar" : key}
                className="h-14 rounded-2xl bg-muted/60 hover:bg-muted active:scale-95 transition-all text-2xl font-semibold text-foreground flex items-center justify-center"
              >
                {key === "backspace" ? <BackspaceIcon size={24} weight="bold" /> : key}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={vm.save}
            disabled={!vm.canSave}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-white transition-colors disabled:opacity-40",
              isIncome ? "bg-income hover:bg-income/90" : "bg-expense hover:bg-expense/90",
            )}
          >
            {vm.isSaving ? "Registrando..." : isIncome ? "Registrar receita" : "Registrar despesa"}
          </button>

          <button
            type="button"
            onClick={vm.goToFullForm}
            className="w-full text-center text-sm font-medium text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Mais opções
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
