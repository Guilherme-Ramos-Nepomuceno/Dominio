// Fonte única de verdade para qual "conta" está ativa no momento: a própria,
// a de um parceiro da família (somente leitura) ou a conta compartilhada do casal.
// Usado tanto por lib/api.ts (para decidir o header X-Account-Id) quanto por
// lib/storage.ts (para decidir de onde buscar os dados) e pelo AccountContext.

export type AccountSelection =
    | { type: "personal" }
    | { type: "partner"; id: string; name: string }
    | { type: "couple"; id: string; name: string }

export const ACTIVE_ACCOUNT_KEY = "finance-active-account"

export function getActiveAccountSelection(): AccountSelection {
    if (typeof window === "undefined") return { type: "personal" }
    try {
        const raw = localStorage.getItem(ACTIVE_ACCOUNT_KEY)
        if (!raw) return { type: "personal" }
        const parsed = JSON.parse(raw)
        if (parsed?.type === "partner" || parsed?.type === "couple") return parsed
        return { type: "personal" }
    } catch {
        return { type: "personal" }
    }
}

export function setActiveAccountSelection(selection: AccountSelection): void {
    if (typeof window === "undefined") return
    localStorage.setItem(ACTIVE_ACCOUNT_KEY, JSON.stringify(selection))
}
