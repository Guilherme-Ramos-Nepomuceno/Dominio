// Date utilities for month navigation and formatting

export const formatCurrency = (amount: number, currency = "BRL"): string => {
  if (typeof window === "undefined") {
    // Server-side fallback
    return `R$ ${amount
      .toFixed(2)
      .replace(".", ",")
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amount)
}

export const formatMonth = (dateString: string): string => {
  const date = new Date(dateString + "-01")
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

export const formatShortMonth = (dateString: string): string => {
  const date = new Date(dateString + "-01")
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  return months[date.getMonth()]
}

export const getCurrentMonth = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export const getNextMonth = (month: string): string => {
  const [year, m] = month.split("-").map(Number)
  const date = new Date(year, m, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export const getPreviousMonth = (month: string): string => {
  const [year, m] = month.split("-").map(Number)
  const date = new Date(year, m - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export const getMonthRange = (centerMonth: string, range = 6): string[] => {
  const months: string[] = []
  let current = centerMonth

  for (let i = 0; i < range; i++) {
    current = getPreviousMonth(current)
  }

  for (let i = 0; i <= range * 2; i++) {
    months.push(current)
    current = getNextMonth(current)
  }

  return months
}

export const isSameMonth = (date1: string, date2: string): boolean => {
  return date1.substring(0, 7) === date2.substring(0, 7)
}

export const parseCurrency = (value: string): number => {
  return Number.parseFloat(value.replace(/[^\d,]/g, "").replace(",", ".")) || 0
}

export const formatCurrencyInput = (value: string): string => {
  // Remove tudo exceto dígitos
  const onlyNumbers = value.replace(/\D/g, "")

  if (!onlyNumbers) return ""

  // Converte para número considerando centavos
  const numberValue = Number.parseInt(onlyNumbers) / 100

  // Formata com separadores brasileiros
  return numberValue.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const parseCurrencyInput = (formattedValue: string): number => {
  const onlyNumbers = formattedValue.replace(/\D/g, "")
  if (!onlyNumbers) return 0
  return Number.parseInt(onlyNumbers) / 100
}

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.getMonth()
  const year = date.getFullYear()

  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

  return `${day} ${months[month]} ${year}`
}
