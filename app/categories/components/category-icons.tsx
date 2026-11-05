import {
  ShoppingCart, ShoppingBag, TShirt, Basket, Package, ForkKnife, Coffee,
  Car, Bus, GasPump, Bicycle, Airplane,
  House, Buildings, Broom, Wrench, Lightbulb, WifiHigh, DeviceMobile,
  Heartbeat, Pill, Stethoscope, Sparkle, Barbell,
  GraduationCap, BookOpen, GameController, FilmSlate, MusicNotes, Gift, PawPrint,
  Receipt, Money, Briefcase, PiggyBank, HandCoins, Wallet, Bank, Tag,
  type Icon as PhosphorIcon,
} from "@phosphor-icons/react"

// Categorias não têm mais cor própria na interface (o ícone usa a cor do
// grupo do plano) — este valor só preenche o campo obrigatório do backend.
export const DEFAULT_CATEGORY_COLOR = "#71717a"

type IconOption = { name: string; Icon: PhosphorIcon }

// Ícones por assunto, na ordem em que aparecem no formulário.
export const ICON_SECTIONS: Array<{ title: string; icons: IconOption[] }> = [
  {
    title: "Compras e comida",
    icons: [
      { name: "ShoppingCart", Icon: ShoppingCart },
      { name: "Basket", Icon: Basket },
      { name: "ForkKnife", Icon: ForkKnife },
      { name: "Coffee", Icon: Coffee },
      { name: "ShoppingBag", Icon: ShoppingBag },
      { name: "TShirt", Icon: TShirt },
      { name: "Package", Icon: Package },
      { name: "Gift", Icon: Gift },
    ],
  },
  {
    title: "Casa e transporte",
    icons: [
      { name: "House", Icon: House },
      { name: "Buildings", Icon: Buildings },
      { name: "Lightbulb", Icon: Lightbulb },
      { name: "WifiHigh", Icon: WifiHigh },
      { name: "DeviceMobile", Icon: DeviceMobile },
      { name: "Broom", Icon: Broom },
      { name: "Wrench", Icon: Wrench },
      { name: "Car", Icon: Car },
      { name: "Bus", Icon: Bus },
      { name: "GasPump", Icon: GasPump },
      { name: "Bicycle", Icon: Bicycle },
      { name: "Airplane", Icon: Airplane },
    ],
  },
  {
    title: "Saúde e lazer",
    icons: [
      { name: "Heartbeat", Icon: Heartbeat },
      { name: "Stethoscope", Icon: Stethoscope },
      { name: "Pill", Icon: Pill },
      { name: "Barbell", Icon: Barbell },
      { name: "Sparkle", Icon: Sparkle },
      { name: "GraduationCap", Icon: GraduationCap },
      { name: "BookOpen", Icon: BookOpen },
      { name: "GameController", Icon: GameController },
      { name: "FilmSlate", Icon: FilmSlate },
      { name: "MusicNotes", Icon: MusicNotes },
      { name: "PawPrint", Icon: PawPrint },
    ],
  },
  {
    title: "Dinheiro",
    icons: [
      { name: "Money", Icon: Money },
      { name: "Briefcase", Icon: Briefcase },
      { name: "PiggyBank", Icon: PiggyBank },
      { name: "HandCoins", Icon: HandCoins },
      { name: "Wallet", Icon: Wallet },
      { name: "Bank", Icon: Bank },
      { name: "Receipt", Icon: Receipt },
      { name: "Tag", Icon: Tag },
    ],
  },
]

// Lista plana (quem só precisa de todos os ícones, ex: escolher na importação).
export const ICON_OPTIONS: IconOption[] = [{ name: "Tag", Icon: Tag }, ...ICON_SECTIONS.flatMap((s) => s.icons).filter((o) => o.name !== "Tag")]

export function iconByName(name: string | null | undefined): PhosphorIcon {
  return ICON_OPTIONS.find((o) => o.name === name)?.Icon ?? Tag
}
