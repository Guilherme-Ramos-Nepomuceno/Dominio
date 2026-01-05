import type { BankName } from "./types"
import { BankIcon, CreditCardIcon,  } from "@phosphor-icons/react"

export const bankColors: Record<BankName, string> = {
  nubank: "#8A05BE",
  inter: "#FF7A00",
  itau: "#003E7E",
  bradesco: "#CC092F",
  santander: "#EC0000",
  caixa: "#005CA9",
  bb: "#FDB913",
  alelo: "#04af2a",
  other: "#6B7280",
}

export const bankLogos: Record<BankName, string> = {
  nubank: "Nu",
  inter: "Inter",
  itau: "Itaú",
  bradesco: "Bradesco",
  santander: "Santander",
  caixa: "Caixa",
  bb: "BB",
  alelo: "Alelo",
  other: "Outro",
}

export const getBankIcon = (bankName: BankName) => {
  const iconMap: Record<BankName, any> = {
    nubank: CreditCardIcon,
    inter: BankIcon,
    itau: BankIcon,
    bradesco: BankIcon,
    santander: BankIcon,
    caixa: BankIcon,
    bb: BankIcon,
    alelo: BankIcon,
    other: CreditCardIcon,
  }

  return iconMap[bankName] || CreditCardIcon
}
