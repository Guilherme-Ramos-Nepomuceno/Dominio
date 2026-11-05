import { fetchApi } from "./api"
import type { CoupleSplitMode } from "./couple-split"

export type { CoupleSplitMode }

export type AccountType = "PERSONAL" | "COUPLE"

export interface FamilyMember {
    id: string
    name: string | null
    email: string
    accountType: AccountType
}

export interface FamilyOverview {
    family: { id: string; name: string; coupleSplitMode: CoupleSplitMode } | null
    members: FamilyMember[]
    pendingInvite: { expiresAt: string } | null
}

export interface FamilyInvite {
    token: string
    expiresAt: string
}

export function getFamily(): Promise<FamilyOverview> {
    return fetchApi("/family")
}

export function createFamilyInvite(): Promise<FamilyInvite> {
    return fetchApi("/family/invites", { method: "POST" })
}

export function acceptFamilyInvite(token: string): Promise<FamilyOverview> {
    return fetchApi(`/family/invites/${token}/accept`, { method: "POST" })
}

export function createCoupleAccount(): Promise<FamilyMember> {
    return fetchApi("/family/couple-account", { method: "POST" })
}

export function updateFamilySettings(settings: { coupleSplitMode: CoupleSplitMode }): Promise<FamilyOverview> {
    return fetchApi("/family/settings", { method: "PUT", body: JSON.stringify(settings) })
}

export interface CoupleSettlement {
    id: string
    month: string
    fromUserId: string
    toUserId: string
    amount: number
    createdById: string
    createdAt: string
}

export function getCoupleSettlements(month: string): Promise<CoupleSettlement[]> {
    return fetchApi(`/family/settlements/${month}`)
}

export function createCoupleSettlement(data: { month: string; fromUserId: string; toUserId: string; amount: number }): Promise<CoupleSettlement> {
    return fetchApi("/family/settlements", { method: "POST", body: JSON.stringify(data) })
}

export function getMemberTransactions(memberId: string, query: Record<string, string> = {}) {
    const params = new URLSearchParams(query).toString()
    return fetchApi(`/family/members/${memberId}/transactions${params ? `?${params}` : ""}`)
}

export function getMemberCards(memberId: string) {
    return fetchApi(`/family/members/${memberId}/cards`)
}

export function getMemberCategories(memberId: string) {
    return fetchApi(`/family/members/${memberId}/categories`)
}

export function getMemberGoals(memberId: string) {
    return fetchApi(`/family/members/${memberId}/goals`)
}

export function getMemberSavings(memberId: string) {
    return fetchApi(`/family/members/${memberId}/savings`)
}

export interface MemberMonthData {
    month: string
    income: number
    expense: number
    balance: number
    transactionCount: number
    pendingInvoiceTotal: number
    pendingInvoiceByCard: Array<{ cardId: string; name: string; bankName: string; total: number }>
    cardlessPendingTotal: number
    cardlessPending: Array<{
        id: string
        description: string
        amount: number
        date: string
        categoryName: string | null // null = sem categoria
        installments: number | null
        currentInstallment: number | null
        recurrence: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY" | "NONE"
    }>
}

export function getMemberMonthData(memberId: string, year: number, month: number): Promise<MemberMonthData> {
    return fetchApi(`/family/members/${memberId}/stats/month-data/${year}/${month}`)
}

export function getMemberTotalBalance(memberId: string, year: number, month: number) {
    return fetchApi(`/family/members/${memberId}/stats/total-balance/${year}/${month}`)
}

export function getMemberCategoryBreakdown(memberId: string, year: number, month: number) {
    return fetchApi(`/family/members/${memberId}/stats/category-breakdown/${year}/${month}`)
}

export interface TransferToFamilyMemberDTO {
    fromCardId: string
    toMemberId: string
    toCardId: string
    amount: number
    description?: string
}

export function transferToFamilyMember(dto: TransferToFamilyMemberDTO): Promise<{ success: boolean }> {
    return fetchApi("/transactions/transfer-to-family-member", { method: "POST", body: JSON.stringify(dto) })
}

export interface CreateTransactionForFamilyMemberDTO {
    toMemberId: string
    toCardId: string
    amount: number
    date: string
    type: "income" | "expense"
    description?: string
}

// Cria só a ponta do parceiro de uma transferência cuja outra ponta já
// existe (ex: linha de extrato importada marcada como "Transferência" com
// destino a conta de um familiar) — diferente de transferToFamilyMember, que
// cria as duas pontas de uma vez.
export function createTransactionForFamilyMember(dto: CreateTransactionForFamilyMemberDTO): Promise<{ success: boolean }> {
    return fetchApi("/transactions/create-for-family-member", {
        method: "POST",
        body: JSON.stringify({ ...dto, type: dto.type === "income" ? "INCOME" : "EXPENSE" }),
    })
}
