// lib/date-utils.ts

export const formatCurrency = (amount: number, currency = "BRL"): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
  }).format(amount)
}

export const formatMonth = (dateString: string): string => {
  if (!dateString) return ""
  const [year, month] = dateString.split("-").map(Number)
  
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ]
  
  return `${months[month - 1]} ${year}`
}

export const formatShortMonth = (dateString: string): string => {
  if (!dateString) return ""
  const [year, month] = dateString.split("-").map(Number)
  
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
  
  return months[month - 1]
}

export const getCurrentMonth = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

// CORREÇÃO 3: Usando construtor seguro (Ano, Mês, Dia, Hora)
export const getNextMonth = (month: string): string => {
  const [year, m] = month.split("-").map(Number)
  // Define dia 1 ao meio-dia (12:00) para evitar pular dia
  const date = new Date(year, m, 1, 12, 0, 0) 
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export const getPreviousMonth = (month: string): string => {
  const [year, m] = month.split("-").map(Number)
  const date = new Date(year, m - 2, 1, 12, 0, 0)
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
  if (!date1 || !date2) return false
  return date1.substring(0, 7) === date2.substring(0, 7)
}

export const parseCurrency = (value: string): number => {
  return Number.parseFloat(value.replace(/[^\d,]/g, "").replace(",", ".")) || 0
}

export const formatCurrencyInput = (value: string): string => {
  const onlyNumbers = value.replace(/\D/g, "")
  if (!onlyNumbers) return ""
  const numberValue = Number.parseInt(onlyNumbers) / 100
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

// CORREÇÃO 5: Tratamento para formatDate (ex: "2026-01-09")
export const formatDate = (dateString: string): string => {
  if (!dateString) return ""

  // Se a string tiver "T" (ISO completa), o new Date costuma funcionar bem.
  // Se for apenas YYYY-MM-DD, aplicamos a correção de fuso.
  if (dateString.includes("T")) {
     const date = new Date(dateString)
     return date.toLocaleDateString("pt-BR", { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')
  }

  const [year, month, day] = dateString.split("-").map(Number)
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

  return `${day} ${months[month - 1]} ${year}`
}