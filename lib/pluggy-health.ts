// Como a tela de banco mostra a saúde de cada conexão e os investimentos que
// vêm do banco. Funções puras (testáveis com node:test). A regra de "está
// saudável ou não" é do backend (dominio-api utils/pluggy-item-health.ts);
// aqui é só texto e decisão de quais botões aparecem.

export type ItemHealthState = "OK" | "ATTENTION" | "RECONNECT" | "DELETED" | "UNKNOWN"

export interface ItemHealthInfo {
  health?: ItemHealthState
  healthReason?: string | null
  consentExpiresAt?: string | null
  consentDaysLeft?: number | null
  bankUpdatedAt?: string | null
}

// A partir daqui já vale renovar a autorização (o push sai com 30 e com 7 dias).
export const CONSENT_RENEW_DAYS = 30

export interface HealthLine {
  tone: "attention" | "muted"
  text: string
}

function dayMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo" })
}

// Linha de status embaixo do nome do banco. null = nada a dizer.
export function healthLine(item: ItemHealthInfo): HealthLine | null {
  if (item.health === "RECONNECT" || item.health === "DELETED" || item.health === "ATTENTION") {
    return { tone: "attention", text: item.healthReason || "A conexão com o banco parou" }
  }
  const days = item.consentDaysLeft
  if (item.health === "OK" && typeof days === "number" && days > 0 && days <= CONSENT_RENEW_DAYS) {
    return { tone: "attention", text: `A autorização vence em ${days} dia${days === 1 ? "" : "s"}` }
  }
  return null
}

// Reconectar (widget em modo de atualização) resolve autorização vencida ou
// caída. Item apagado no MeuPluggy não tem o que reconectar: só remover.
export function canReconnect(item: ItemHealthInfo): boolean {
  if (item.health === "RECONNECT" || item.health === "ATTENTION") return true
  const days = item.consentDaysLeft
  return item.health === "OK" && typeof days === "number" && days <= CONSENT_RENEW_DAYS
}

export function needsAction(item: ItemHealthInfo): boolean {
  return item.health === "RECONNECT" || item.health === "DELETED" || item.health === "ATTENTION"
}

// Detalhes no painel aberto do banco: quando atualizou e até quando vale.
export function healthDetails(item: ItemHealthInfo): string[] {
  const lines: string[] = []
  if (item.bankUpdatedAt) lines.push(`Banco atualizado em ${dayMonthYear(item.bankUpdatedAt)}`)
  if (item.consentExpiresAt && item.health !== "DELETED") {
    const days = item.consentDaysLeft
    const suffix = typeof days === "number" && days > 0 ? ` (${days} dia${days === 1 ? "" : "s"})` : ""
    lines.push(`Autorização válida até ${dayMonthYear(item.consentExpiresAt)}${suffix}`)
  }
  return lines
}

// ---- Investimentos ----

export interface InvestmentLike {
  name: string
  subtype: string | null
  balance: number
  status: string | null
  rate: number | null
  rateType: string | null
  fixedAnnualRate: number | null
  dueDate: string | null
}

// Resgatado (ou zerado) não interessa na lista principal.
export function isActiveInvestment(inv: Pick<InvestmentLike, "status" | "balance">): boolean {
  return inv.status !== "TOTAL_WITHDRAWAL" && inv.balance > 0
}

// Agrupa os investimentos pelo tipo que a Pluggy manda (CDB, LCI e Tesouro
// ficam em "Renda fixa"). A ordem dos grupos é fixa, e grupo vazio não aparece.
export type InvestmentGroupKey = "FIXED_INCOME" | "EQUITY" | "MUTUAL_FUND" | "ETF" | "COE" | "OTHER"

export const INVESTMENT_GROUP_LABELS: Record<InvestmentGroupKey, string> = {
  FIXED_INCOME: "Renda fixa",
  EQUITY: "Ações",
  MUTUAL_FUND: "Fundos",
  ETF: "ETFs",
  COE: "COE",
  OTHER: "Outros",
}

const GROUP_ORDER: InvestmentGroupKey[] = ["FIXED_INCOME", "EQUITY", "MUTUAL_FUND", "ETF", "COE", "OTHER"]

export function investmentGroupKey(type: string | null | undefined): InvestmentGroupKey {
  switch (type) {
    case "FIXED_INCOME":
      return "FIXED_INCOME"
    case "SECURITY":
    case "EQUITY":
      return "EQUITY"
    case "MUTUAL_FUND":
      return "MUTUAL_FUND"
    case "ETF":
      return "ETF"
    case "COE":
      return "COE"
    default:
      return "OTHER"
  }
}

export interface InvestmentGroup<T> {
  key: InvestmentGroupKey
  label: string
  items: T[]
  total: number
}

export function groupInvestments<T extends { type: string | null; balance: number }>(investments: T[]): InvestmentGroup<T>[] {
  const groups = new Map<InvestmentGroupKey, T[]>()
  for (const inv of investments) {
    const key = investmentGroupKey(inv.type)
    groups.set(key, [...(groups.get(key) ?? []), inv])
  }
  return GROUP_ORDER.filter((key) => groups.has(key)).map((key) => {
    const items = groups.get(key)!
    return {
      key,
      label: INVESTMENT_GROUP_LABELS[key],
      items,
      total: items.reduce((sum, inv) => sum + inv.balance, 0),
    }
  })
}

function percent(value: number): string {
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`
}

// "90% do CDI", "IPCA + 5,5%", "12% a.a." — o que o banco mandou, em português.
export function rateLabel(inv: Pick<InvestmentLike, "rate" | "rateType" | "fixedAnnualRate">): string | null {
  const fixed = inv.fixedAnnualRate && inv.fixedAnnualRate > 0 ? inv.fixedAnnualRate : null
  if (inv.rateType && inv.rateType !== "PRE_FIXADO" && inv.rate) {
    if (inv.rateType === "IPCA" || inv.rateType === "IGPM" || inv.rateType === "INPC") {
      return fixed ? `${inv.rateType} + ${percent(fixed)}` : inv.rateType
    }
    return `${percent(inv.rate)} do ${inv.rateType}`
  }
  if (fixed) return `${percent(fixed)} a.a.`
  return null
}

// "LCI · 90% do CDI · vence 05/2031"
export function investmentSubtitle(inv: InvestmentLike): string {
  const parts = [inv.subtype, rateLabel(inv)]
  if (inv.dueDate) {
    const d = new Date(inv.dueDate)
    parts.push(`vence ${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`)
  }
  return parts.filter(Boolean).join(" · ")
}
