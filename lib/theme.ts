// Theme configuration and utilities
export const THEME_KEY = "finance-app-theme"

export type ThemeMode = "light" | "dark"

// Cor da barra do sistema (theme-color) e da abertura do PWA: a mesma do
// fundo de cada tema (--background em globals.css), para não ficar uma faixa
// no topo (ADR-030).
export const SYSTEM_BAR_COLOR: Record<ThemeMode, string> = {
  light: "#f1f5f5",
  dark: "#040609",
}

// O layout manda uma meta por prefers-color-scheme; quando a pessoa escolhe
// o tema no app, as duas passam a usar a cor do tema escolhido.
const syncSystemBar = (theme: ThemeMode) => {
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.setAttribute("content", SYSTEM_BAR_COLOR[theme])
  })
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
  syncSystemBar(theme)
}
