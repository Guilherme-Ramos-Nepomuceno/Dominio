import { AirplaneTilt, Bicycle, Car, GameController, GraduationCap, Heart, House, Laptop, PiggyBank, ShoppingCart, Target, type Icon } from "@phosphor-icons/react"

// Ícones de objetivo. O nome é o que vai para a API (campo `icon`).
export const GOAL_ICON_OPTIONS: { name: string; Icon: Icon }[] = [
  { name: "Target", Icon: Target },
  { name: "House", Icon: House },
  { name: "Car", Icon: Car },
  { name: "AirplaneTilt", Icon: AirplaneTilt },
  { name: "GraduationCap", Icon: GraduationCap },
  { name: "Laptop", Icon: Laptop },
  { name: "GameController", Icon: GameController },
  { name: "Heart", Icon: Heart },
  { name: "PiggyBank", Icon: PiggyBank },
  { name: "ShoppingCart", Icon: ShoppingCart },
  { name: "Bicycle", Icon: Bicycle },
]

export function goalIconFor(name: string | null | undefined): Icon {
  return GOAL_ICON_OPTIONS.find((o) => o.name === name)?.Icon ?? Target
}
