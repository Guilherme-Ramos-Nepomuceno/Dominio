import { fetchApi } from "./api"

export type SyncAction = "create" | "update" | "delete"
export type SyncEntity = "transaction" | "card" | "category" | "goal" | "savingsGoal" | "setting"

export interface SyncOperation {
    id: string
    entity: SyncEntity
    action: SyncAction
    data: any
    timestamp: string
}

const SYNC_QUEUE_KEY = "finance-sync-queue"

export function getSyncQueue(): SyncOperation[] {
    if (typeof window === "undefined") return []
    try {
        const item = localStorage.getItem(SYNC_QUEUE_KEY)
        return item ? JSON.parse(item) : []
    } catch (error) {
        console.error("Error reading sync queue:", error)
        return []
    }
}

export function saveSyncQueue(queue: SyncOperation[]): void {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue))
    } catch (error) {
        console.error("Error saving sync queue:", error)
    }
}

export function addToSyncQueue(entity: SyncEntity, action: SyncAction, data: any): void {
    const queue = getSyncQueue()

    const newOperation: SyncOperation = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        entity,
        action,
        data,
        timestamp: new Date().toISOString(),
    }

    // Optimize queue: If we have multiple updates for the same entity item, keep the latest
    // If we have a create then update, we could theoretically merge. But backend handles bulk sync, so simple pushing is fine for MVP.
    queue.push(newOperation)
    saveSyncQueue(queue)

    // Try to sync immediately
    processSyncQueue()
}

let isSyncing = false

export async function processSyncQueue(): Promise<void> {
    if (typeof window === "undefined" || !navigator.onLine || isSyncing) return

    const queue = getSyncQueue()
    if (queue.length === 0) return

    isSyncing = true

    try {
        // We send the bulk payload as documented in PRD
        // "POST /sync/bulk" accept an array of { entity, action, data }
        const payload = queue.map(op => ({
            entity: op.entity,
            action: op.action,
            data: op.data,
            id: op.data?.id
        }))

        await fetchApi('/sync/bulk', {
            method: 'POST',
            body: JSON.stringify(payload)
        })

        // If successful, clear the queue
        // Note: if some entities fail in the backend, the whole queue is considered processed in this MVP unless the backend throws 500
        saveSyncQueue([])
        console.log(`Synced ${queue.length} items to backend.`)
    } catch (error) {
        console.error("Background sync failed, will retry later:", error)
        // Don't clear the queue, keep it for next time
    } finally {
        isSyncing = false
    }
}

// Subscribe to online event to process queue when network state changes
if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
        console.log("Back online. Processing sync queue...")
        processSyncQueue()
    })
}

/**
 * Pushes all current LocalStorage data to the sync queue as 'create' operations.
 * Use this when the backend database is empty but the client has local data.
 */
export async function syncFullLocalStorageToBackend(): Promise<{ success: boolean; count: number; message?: string }> {
    if (typeof window === "undefined") return { success: false, count: 0, message: "Window is undefined" }

    // 1. Verify if the database was wiped and the user no longer exists
    try {
        await fetchApi('/users/me')
    } catch (error: any) {
        if (error.message.includes('404') || error.message.includes('não encontrado')) {
            console.warn("Banco de dados parece estar vazio. Recriando perfil com dados locais...")
            const { getCurrentUser, registerUser } = await import("./auth")
            const user = getCurrentUser()
            if (user) {
                // Register the user again with a placeholder password
                const result = await registerUser(user.name || "Usuário", user.email, "senha_temporaria123")
                if (!result.success) {
                    return { success: false, count: 0, message: "Falha ao recriar o perfil do usuário no Banco de Dados." }
                }
            } else {
                return { success: false, count: 0, message: "Nenhum usuário local identificado para recuperar." }
            }
        } else {
            // Some other API error (e.g. backend offline)
            throw error
        }
    }

    const STORAGE_KEYS = {
        TRANSACTIONS: "finance-transactions",
        CATEGORIES: "finance-categories",
        GOALS: "finance-goals",
        SETTINGS: "finance-settings",
        CARDS: "finance-cards",
        SAVINGS_GOALS: "finance-savings-goals",
    } as const

    const entities: { key: string; entity: SyncEntity }[] = [
        { key: STORAGE_KEYS.CATEGORIES, entity: "category" },
        { key: STORAGE_KEYS.CARDS, entity: "card" },
        { key: STORAGE_KEYS.TRANSACTIONS, entity: "transaction" },
        { key: STORAGE_KEYS.GOALS, entity: "goal" },
        { key: STORAGE_KEYS.SAVINGS_GOALS, entity: "savingsGoal" },
        { key: STORAGE_KEYS.SETTINGS, entity: "setting" },
    ]

    let totalAdded = 0
    const queue = getSyncQueue()

    for (const { key, entity } of entities) {
        const stored = localStorage.getItem(key)
        if (!stored) continue

        try {
            const data = JSON.parse(stored)

            if (Array.isArray(data)) {
                for (const item of data) {
                    queue.push({
                        id: `sync_full_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                        entity,
                        action: "create",
                        data: item,
                        timestamp: new Date().toISOString()
                    })
                    totalAdded++
                }
            } else if (data && typeof data === 'object') {
                // For settings which is a single object
                queue.push({
                    id: `sync_full_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    entity,
                    action: "update", // Use update for settings as it's usually a single record
                    data: data,
                    timestamp: new Date().toISOString()
                })
                totalAdded++
            }
        } catch (e) {
            console.error(`Error parsing ${key} for full sync:`, e)
        }
    }

    if (totalAdded > 0) {
        saveSyncQueue(queue)
        await processSyncQueue()
        return { success: true, count: totalAdded }
    }

    return { success: false, count: 0, message: "Nenhum dado encontrado para sincronizar." }
}

