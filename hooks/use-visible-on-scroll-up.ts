"use client"

import { useEffect, useRef, useState } from "react"
import { fabVisibleAfterScroll, SCROLL_THRESHOLD } from "@/lib/scroll"

// Some ao rolar para baixo (não cobre o conteúdo que a pessoa está lendo) e
// volta ao rolar para cima ou perto do topo. Usado pelo menu inferior e pelo
// botão "+": os dois ouvem a mesma rolagem com a mesma regra, então somem e
// voltam juntos.
export function useVisibleOnScrollUp(): boolean {
  const [visible, setVisible] = useState(true)
  const lastY = useRef(0)
  const visibleRef = useRef(true)
  useEffect(() => {
    lastY.current = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      const next = fabVisibleAfterScroll(lastY.current, y, visibleRef.current)
      if (Math.abs(y - lastY.current) >= SCROLL_THRESHOLD || y <= 40) lastY.current = y
      if (next !== visibleRef.current) {
        visibleRef.current = next
        setVisible(next)
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  return visible
}
