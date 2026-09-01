import { fetchApi, ApiError } from './api';

const CONNECTION_ERROR_MESSAGE = "Não foi possível conectar ao servidor. Tente novamente.";

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string; // Optional URL or base64
    createdAt: string;
}

const AUTH_KEYS = {
    USER_SESSION: "finance-user-session",
} as const;

// --- Auth Actions ---

export async function registerUser(name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
        const response = await fetchApi('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        if (response?.token) {
            localStorage.setItem('finance-token', response.token);
            localStorage.setItem(AUTH_KEYS.USER_SESSION, JSON.stringify(response.user));
            return { success: true };
        }

        return { success: false, message: "Não foi possível criar sua conta. Tente novamente." };
    } catch (e: any) {
        if (e instanceof ApiError) {
            const message = e.status === 409 ? "Este e-mail já está cadastrado." : "Não foi possível criar sua conta. Tente novamente."
            return { success: false, message };
        }
        return { success: false, message: CONNECTION_ERROR_MESSAGE };
    }
}

export async function loginUser(email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
        const response = await fetchApi('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        if (response?.token) {
            localStorage.setItem('finance-token', response.token);
            localStorage.setItem(AUTH_KEYS.USER_SESSION, JSON.stringify(response.user));
            return { success: true };
        }
        return { success: false, message: "E-mail ou senha incorretos." };
    } catch (e: any) {
        if (e instanceof ApiError) {
            return { success: false, message: "E-mail ou senha incorretos." };
        }
        return { success: false, message: CONNECTION_ERROR_MESSAGE };
    }
}

export function logoutUser() {
    localStorage.removeItem(AUTH_KEYS.USER_SESSION);
    localStorage.removeItem('finance-token');
    localStorage.removeItem('finance-active-account');
    window.dispatchEvent(new Event("auth-change"));
}

export function getCurrentUser(): User | null {
    if (typeof window === "undefined") return null;
    const session = localStorage.getItem(AUTH_KEYS.USER_SESSION);
    return session ? JSON.parse(session) : null;
}

export function isAuthenticated(): boolean {
    return !!getCurrentUser();
}

export async function updateCurrentUser(updates: Partial<User>) {
    const current = getCurrentUser();
    if (!current) return;

    const updated = await fetchApi('/users/me', {
        method: 'PUT',
        body: JSON.stringify({
            name: updates.name,
            email: updates.email
        })
    });

    localStorage.setItem(AUTH_KEYS.USER_SESSION, JSON.stringify({ ...current, ...updated }));
    window.dispatchEvent(new Event("auth-change"));
}
