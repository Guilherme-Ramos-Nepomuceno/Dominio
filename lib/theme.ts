// Theme configuration and utilities
export const THEME_KEY = "finance-app-theme"

export type ThemeMode = "light" | "dark"

export interface ThemeColors {
  income: string
  expense: string
  savings: string
}

export const defaultThemeColors: ThemeColors = {
  income: "#4ade80",
  expense: "#f87171",
  savings: "#a78bfa",
}

export const getTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light"

  const stored = localStorage.getItem(THEME_KEY)
  if (stored === "dark" || stored === "light") return stored

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export const setTheme = (theme: ThemeMode) => {
  if (typeof window === "undefined") return

  localStorage.setItem(THEME_KEY, theme)

  if (theme === "dark") {
    document.documentElement.classList.add("dark")
  } else {
    document.documentElement.classList.remove("dark")
  }
}

export const toggleTheme = (): ThemeMode => {
  const current = getTheme()
  const next = current === "light" ? "dark" : "light"
  setTheme(next)
  return next
}
