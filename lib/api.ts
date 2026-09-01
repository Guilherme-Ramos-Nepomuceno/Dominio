import { getActiveAccountSelection } from './active-account'

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export class ApiError extends Error {
    status: number

    constructor(status: number, message: string) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

// Só o tipo 'couple' de fato troca a conta usada nas chamadas via header,
// já que dados do parceiro são sempre somente leitura via endpoints /family/members/:id/*.
function getActiveAccountHeaderId(): string | null {
    const selection = getActiveAccountSelection()
    return selection.type === 'couple' ? selection.id : null
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('finance-token') : null
    const activeAccountId = getActiveAccountHeaderId()

    const headers = new Headers(options.headers || {})

    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
    }

    if (activeAccountId) {
        headers.set('X-Account-Id', activeAccountId)
    }

    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json')
    }

    const config: RequestInit = {
        ...options,
        headers,
    }

    const response = await fetch(`${API_URL}${endpoint}`, config)

    if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        const message = errorBody?.error || errorBody?.message || 'Não foi possível completar a operação.'
        throw new ApiError(response.status, message)
    }

    // Not all endpoints return JSON, gracefully handle empty distinct status like 204
    if (response.status === 204) {
        return null;
    }

    try {
        return await response.json()
    } catch (e) {
        return null; // Handle cases where response says OK but isn't valid JSON
    }
}
