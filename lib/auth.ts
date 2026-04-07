import { v4 as uuidv4 } from 'uuid';
import { fetchApi } from './api';

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string; // Optional URL or base64
    createdAt: string;
}

const AUTH_KEYS = {
    USER_SESSION: "finance-user-session",
    USERS_DB: "finance-users-db", // Simulates a database of users
} as const;

// --- Simulated Database Helpers ---
function getUsersDB(): User[] {
    if (typeof window === "undefined") return [];
    const db = localStorage.getItem(AUTH_KEYS.USERS_DB);
    return db ? JSON.parse(db) : [];
}

function saveUserToDB(user: User) {
    const users = getUsersDB();
    users.push(user);
    localStorage.setItem(AUTH_KEYS.USERS_DB, JSON.stringify(users));
}

// --- Auth Actions ---

export async function registerUser(name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> {
    try {
        const response = await fetchApi('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password })
        });

        // If login returns token on register directly:
        if (response?.token) {
            localStorage.setItem('finance-token', response.token);
            localStorage.setItem(AUTH_KEYS.USER_SESSION, JSON.stringify(response.user || { id: uuidv4(), name, email, createdAt: new Date().toISOString() }));
            return { success: true };
        }

        // Assume we need to login after register if no token returned
        return await loginUser(email, password);
    } catch (e: any) {
        return { success: false, message: e.message || "Erro ao cadastrar." };
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
            localStorage.setItem(AUTH_KEYS.USER_SESSION, JSON.stringify(response.user || { email }));
            return { success: true };
        }
        return { success: false, message: "Token inválido ou não retornado." };
    } catch (e: any) {
        return { success: false, message: e.message || "Erro ao entrar." };
    }
}

export function logoutUser() {
    localStorage.removeItem(AUTH_KEYS.USER_SESSION);
    localStorage.removeItem('finance-token');
    // Dispath auth-change event
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

    const updated = { ...current, ...updates };
    localStorage.setItem(AUTH_KEYS.USER_SESSION, JSON.stringify(updated));

    // Update in DB too (Local mockup db)
    const users = getUsersDB();
    const dbIndex = users.findIndex(u => u.id === current.id);
    if (dbIndex >= 0) {
        users[dbIndex] = updated;
        localStorage.setItem(AUTH_KEYS.USERS_DB, JSON.stringify(users));
    }

    // Call Backend
    try {
        await fetchApi('/users/me', {
            method: 'PUT',
            body: JSON.stringify({
                name: updates.name,
                email: updates.email
            })
        });
    } catch (error) {
        console.error("Failed to update user in backend:", error);
    }

    window.dispatchEvent(new Event("auth-change"));
}
