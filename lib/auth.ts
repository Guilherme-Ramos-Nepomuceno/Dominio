import { v4 as uuidv4 } from 'uuid';

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

export function registerUser(name: string, email: string, password: string): { success: boolean; message?: string } {
    // In a real app, password should be hashed. Here we just simulate.
    const users = getUsersDB();

    if (users.find(u => u.email === email)) {
        return { success: false, message: "Email já cadastrado." };
    }

    const newUser: User = {
        id: uuidv4(),
        name,
        email,
        createdAt: new Date().toISOString(),
    };

    saveUserToDB(newUser);

    // Auto login after register
    localStorage.setItem(AUTH_KEYS.USER_SESSION, JSON.stringify(newUser));
    return { success: true };
}

export function loginUser(email: string, password: string): { success: boolean; message?: string } {
    // Simulate checking password (accepts any password for existing email in this mock)
    const users = getUsersDB();
    const user = users.find(u => u.email === email);

    if (!user) {
        return { success: false, message: "Usuário não encontrado." };
    }

    // In a real app, check password hash here.
    // For this mock, we trust the email.

    localStorage.setItem(AUTH_KEYS.USER_SESSION, JSON.stringify(user));
    return { success: true };
}

export function logoutUser() {
    localStorage.removeItem(AUTH_KEYS.USER_SESSION);
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

export function updateCurrentUser(updates: Partial<User>) {
    const current = getCurrentUser();
    if (!current) return;

    const updated = { ...current, ...updates };
    localStorage.setItem(AUTH_KEYS.USER_SESSION, JSON.stringify(updated));

    // Update in DB too
    const users = getUsersDB();
    const dbIndex = users.findIndex(u => u.id === current.id);
    if (dbIndex >= 0) {
        users[dbIndex] = updated;
        localStorage.setItem(AUTH_KEYS.USERS_DB, JSON.stringify(users));
    }

    window.dispatchEvent(new Event("auth-change"));
}
