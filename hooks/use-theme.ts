"use client"

import { useEffect, useState } from "react"
import { getTheme, setTheme as saveTheme, type ThemeMode } from "@/lib/theme"

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>("light")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const current = getTheme()
    setThemeState(current)
    saveTheme(current)
    setMounted(true)
  }, [])

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme)
    saveTheme(newTheme)
  }

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
  }

  return { theme, setTheme, toggleTheme, mounted }
}
