"use client"

import type React from "react"

import { useState } from "react"
import {
  X, TrendUp, TrendDown,
  ShoppingCart, ShoppingBag, TShirt, Basket, Package, ForkKnife, Coffee,
  Car, Bus, GasPump, Bicycle,
  House, Buildings, Broom, Wrench, Lightbulb, WifiHigh,
  Heartbeat, Pill, Stethoscope, Sparkle, GraduationCap,
  GameController, FilmSlate, MusicNotes, Barbell, Airplane, Gift, PawPrint, BookOpen,
  DeviceMobile, Receipt,
  Money, Briefcase, PiggyBank, HandCoins, Wallet, Bank, Tag,
} from "@phosphor-icons/react"
import { addCategory } from "@/lib/storage"
import type { TransactionType } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AddCategoryDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Categorias não têm mais cor própria na interface (ícones são monocromáticos em
// todo o app) — este valor só preenche o campo obrigatório do backend.
const DEFAULT_CATEGORY_COLOR = "#71717a"

const ICON_OPTIONS = [
  { name: "Tag", Icon: Tag },
  // Compras / dia a dia
  { name: "ShoppingCart", Icon: ShoppingCart },
  { name: "ShoppingBag", Icon: ShoppingBag },
  { name: "TShirt", Icon: TShirt },
  { name: "Basket", Icon: Basket },
  { name: "Package", Icon: Package },
  { name: "ForkKnife", Icon: ForkKnife },
  { name: "Coffee", Icon: Coffee },
  // Transporte
  { name: "Car", Icon: Car },
  { name: "Bus", Icon: Bus },
  { name: "GasPump", Icon: GasPump },
  { name: "Bicycle", Icon: Bicycle },
  { name: "Airplane", Icon: Airplane },
  // Moradia / contas
  { name: "House", Icon: House },
  { name: "Buildings", Icon: Buildings },
  { name: "Broom", Icon: Broom },
  { name: "Wrench", Icon: Wrench },
  { name: "Lightbulb", Icon: Lightbulb },
  { name: "WifiHigh", Icon: WifiHigh },
  { name: "DeviceMobile", Icon: DeviceMobile },
  // Saúde / cuidados pessoais
  { name: "Heartbeat", Icon: Heartbeat },
  { name: "Pill", Icon: Pill },
  { name: "Stethoscope", Icon: Stethoscope },
  { name: "Sparkle", Icon: Sparkle },
  // Educação / lazer
  { name: "GraduationCap", Icon: GraduationCap },
  { name: "BookOpen", Icon: BookOpen },
  { name: "GameController", Icon: GameController },
  { name: "FilmSlate", Icon: FilmSlate },
  { name: "MusicNotes", Icon: MusicNotes },
  { name: "Barbell", Icon: Barbell },
  { name: "Gift", Icon: Gift },
  { name: "PawPrint", Icon: PawPrint },
  // Financeiro
  { name: "Receipt", Icon: Receipt },
  { name: "Money", Icon: Money },
  { name: "Briefcase", Icon: Briefcase },
  { name: "PiggyBank", Icon: PiggyBank },
  { name: "HandCoins", Icon: HandCoins },
  { name: "Wallet", Icon: Wallet },
  { name: "Bank", Icon: Bank },
]

export function AddCategoryDialog({ isOpen, onClose, onSuccess }: AddCategoryDialogProps) {
  const [name, setName] = useState("")
  const [type, setType] = useState<TransactionType>("expense")
  const [icon, setIcon] = useState(ICON_OPTIONS[0].name)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      alert("Digite um nome para a categoria")
      return
    }

    await addCategory({
      name: name.trim(),
      type,
      color: DEFAULT_CATEGORY_COLOR,
      icon,
    })

    setName("")
    setType("expense")
    setIcon(ICON_OPTIONS[0].name)
    onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card w-full max-w-md rounded-t-3xl md:rounded-3xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Nova Categoria</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Tipo</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setType("expense")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] font-semibold transition-all",
                  type === "expense"
                    ? "bg-expense text-white shadow-lg"
                    : "bg-muted text-muted-foreground border border-border",
                )}
              >
                <TrendDown weight="bold" size={18} />
                Despesa
              </button>

              <button
                type="button"
                onClick={() => setType("income")}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-[1vw] font-semibold transition-all",
                  type === "income"
                    ? "bg-income text-white shadow-lg"
                    : "bg-muted text-muted-foreground border border-border",
                )}
              >
                <TrendUp weight="bold" size={18} />
                Receita
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mercado, Transporte, Investimentos..."
              className="w-full px-4 py-3 rounded-[1vw] bg-background border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              required
              autoFocus
            />
          </div>

          {/* Icon Picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Ícone</label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_OPTIONS.map(({ name: iconName, Icon }) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    icon === iconName
                      ? "text-primary ring-2 ring-primary/40 scale-110"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon size={22} weight="duotone" />
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-[1vw] border border-border text-foreground font-medium hover:bg-muted transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 rounded-[1vw] bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Criar Categoria
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
