"use client"

import type React from "react"
import { useState } from "react"
import { BackspaceIcon } from "@phosphor-icons/react"
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"
import { formatCentsBRL, type KeypadKey } from "@/lib/quick-add"
import { CardChips, CategoryChip, Chip, ChipRow, DateChips, FieldLabel, PaymentMethodToggle } from "@/components/transaction-inputs/transaction-inputs"
import type { QuickAddViewModel } from "./use-quick-add-view-model"

const KEYPAD: KeypadKey[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "backspace"]

// Registro rápido: valor no teclado numérico grande + confirmação já é o
// registro completo. Categoria (as 4 mais registradas), conta e data são
// opcionais e ficam na mesma tela, em pílulas. "Mais opções" leva ao
// formulário completo.
export function QuickAddSheet({ vm }: { vm: QuickAddViewModel }) {
  const isIncome = vm.type === "income"
  const [showAllCategories, setShowAllCategories] = useState(false)

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

  const categories = showAllCategories ? vm.allCategories : vm.chips
  const hasMoreCategories = vm.allCategories.length > vm.chips.length

  return (
    <Drawer
      open={vm.open}
      onOpenChange={(open) => {
        vm.setOpen(open)
        if (!open) setShowAllCategories(false)
      }}
    >
      <DrawerContent
        onKeyDown={handleKeyDown}
        className="bg-background md:max-w-md md:mx-auto data-[vaul-drawer-direction=bottom]:max-h-[94vh] rounded-t-3xl"
      >
        <div className="overflow-y-auto px-5 pt-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <DrawerTitle className="text-lg font-semibold">Registro rápido</DrawerTitle>
              <DrawerDescription className="text-xs">Só o valor já basta, o resto é opcional.</DrawerDescription>
            </div>
            {/* Despesa / receita */}
            <div role="radiogroup" aria-label="Tipo" className="inline-flex shrink-0 rounded-full bg-muted/50 p-0.5 text-xs font-semibold">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={vm.type === t}
                  onClick={() => {
                    vm.changeType(t)
                    setShowAllCategories(false)
                  }}
                  className={cn(
                    "rounded-full px-3 py-1.5 transition-colors",
                    vm.type === t ? (t === "income" ? "bg-income text-white" : "bg-expense text-white") : "text-muted-foreground",
                  )}
                >
                  {t === "income" ? "Receita" : "Despesa"}
                </button>
              ))}
            </div>
          </div>

          {/* Valor */}
          <p
            className={cn(
              "text-center text-5xl font-semibold tabular-nums tracking-tight",
              vm.cents === 0 ? "text-muted-foreground/60" : isIncome ? "text-income" : "text-foreground",
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
            className="w-full border-b border-border bg-transparent px-0 py-2 text-center text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:outline-none"
          />

          {/* Categoria: as mais registradas; "Outras" abre todas */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <FieldLabel>Categoria</FieldLabel>
              <ChipRow wrap>
                {categories.map((category) => (
                  <CategoryChip
                    key={category.id}
                    category={category}
                    selected={vm.categoryId === category.id}
                    suggested={vm.suggestedCategoryId === category.id}
                    onClick={() => vm.tapChip(category.id)}
                  />
                ))}
                {hasMoreCategories && (
                  <Chip selected={false} onClick={() => setShowAllCategories((v) => !v)} className="text-muted-foreground">
                    {showAllCategories ? "Menos" : "Outras"}
                  </Chip>
                )}
              </ChipRow>
            </div>
          )}

          {/* Conta */}
          {vm.availableCards.length > 0 && (
            <div className="space-y-2">
              <FieldLabel hint={vm.isComboCard ? <PaymentMethodToggle value={vm.paymentMethod} onChange={vm.setPaymentMethod} /> : undefined}>
                Conta
              </FieldLabel>
              <CardChips cards={vm.availableCards} value={vm.cardId} onChange={vm.setCardId} />
            </div>
          )}

          {/* Quando */}
          <div className="space-y-2">
            <FieldLabel>Quando</FieldLabel>
            <DateChips value={vm.date} onChange={vm.setDate} />
          </div>

          {/* Teclado numérico: responde no toque (pointerdown), sem esperar o
              clique — o valor lá em cima muda na hora. */}
          <div className="grid grid-cols-3 gap-1 select-none touch-manipulation">
            {KEYPAD.map((key) => (
              <button
                key={key}
                type="button"
                onPointerDown={(e) => {
                  e.preventDefault()
                  vm.pressKey(key)
                }}
                onClick={(e) => {
                  // Teclado/leitor de tela (sem ponteiro): o clique ainda funciona.
                  if (e.detail === 0) vm.pressKey(key)
                }}
                onContextMenu={(e) => {
                  // Segurar o apagar limpa tudo.
                  if (key === "backspace") {
                    e.preventDefault()
                    vm.pressKey("clear")
                  }
                }}
                aria-label={key === "backspace" ? "Apagar" : key}
                className="h-14 rounded-2xl text-2xl font-medium text-foreground flex items-center justify-center active:bg-muted transition-colors"
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
              "w-full py-4 rounded-2xl font-semibold transition-colors disabled:opacity-40",
              isIncome ? "bg-income text-white hover:bg-income/90" : "bg-foreground text-background hover:bg-foreground/90",
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
