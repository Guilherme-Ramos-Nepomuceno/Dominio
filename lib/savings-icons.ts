// Ícones disponíveis para reservas (poupanças) — lista compartilhada entre o
// cadastro, a edição e a exibição do card, para que fiquem sempre em sincronia.
import {
  PiggyBank,
  Target,
  Wallet,
  Airplane,
  Umbrella,
  TrendUp,
  House,
  Car,
  GraduationCap,
  HeartStraight,
  Gift,
  Baby,
} from "@phosphor-icons/react"

export const SAVINGS_ICON_OPTIONS = [
  { name: "PiggyBank", Icon: PiggyBank, label: "Cofrinho" },
  { name: "Target", Icon: Target, label: "Meta" },
  { name: "Wallet", Icon: Wallet, label: "Carteira" },
  { name: "Airplane", Icon: Airplane, label: "Viagem" },
  { name: "Umbrella", Icon: Umbrella, label: "Praia" },
  { name: "TrendUp", Icon: TrendUp, label: "Investimento" },
  { name: "House", Icon: House, label: "Casa" },
  { name: "Car", Icon: Car, label: "Carro" },
  { name: "GraduationCap", Icon: GraduationCap, label: "Estudos" },
  { name: "HeartStraight", Icon: HeartStraight, label: "Casamento" },
  { name: "Gift", Icon: Gift, label: "Presente" },
  { name: "Baby", Icon: Baby, label: "Bebê" },
] as const

export function getSavingsIcon(name?: string) {
  return SAVINGS_ICON_OPTIONS.find((option) => option.name === name)?.Icon ?? PiggyBank
}
