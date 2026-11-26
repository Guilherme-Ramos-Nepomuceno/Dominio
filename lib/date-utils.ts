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

export const getCurrentMonth = (): string => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

// Cartão de crédito com dia de fechamento: uma compra feita NAQUELE dia ou
// depois já entra na fatura do mês seguinte, não na do mês da compra. Sem
// dia de fechamento cadastrado, a fatura é simplesmente o mês da compra
// (comportamento de antes, mantido pra cartões que não configuraram isso).
export const getInvoiceMonth = (dateString: string, closingDate?: number | null): string => {
  const date = new Date(dateString)
  let year = date.getFullYear()
  let month = date.getMonth() + 1 // 1-12

  if (closingDate && date.getDate() >= closingDate) {
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`
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