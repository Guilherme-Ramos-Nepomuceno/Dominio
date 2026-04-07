export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333'

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
    const token = typeof window !== 'undefined' ? localStorage.getItem('finance-token') : null

    const headers = new Headers(options.headers || {})

    if (token) {
        headers.set('Authorization', `Bearer ${token}`)
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
        const errorBody = await response.text().catch(() => null)
        throw new Error(`API error ${response.status}: ${errorBody || response.statusText}`)
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
