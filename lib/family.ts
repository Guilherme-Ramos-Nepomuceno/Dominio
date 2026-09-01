import { fetchApi } from "./api"

export type AccountType = "PERSONAL" | "COUPLE"

export interface FamilyMember {
    id: string
    name: string | null
    email: string
    accountType: AccountType
}

export interface FamilyOverview {
    family: { id: string; name: string } | null
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

export function getMemberMonthData(memberId: string, year: number, month: number) {
    return fetchApi(`/family/members/${memberId}/stats/month-data/${year}/${month}`)
}

export function getMemberTotalBalance(memberId: string, year: number, month: number) {
    return fetchApi(`/family/members/${memberId}/stats/total-balance/${year}/${month}`)
}

export function getMemberCategoryBreakdown(memberId: string, year: number, month: number) {
    return fetchApi(`/family/members/${memberId}/stats/category-breakdown/${year}/${month}`)
}
