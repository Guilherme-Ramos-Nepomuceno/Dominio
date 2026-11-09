"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { X } from "@phosphor-icons/react"
import { tooltipPosition, type GuideStep } from "@/lib/guide"

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

const PADDING = 6
// Diálogo, painel ou menu aberto por cima da tela: a dica sai do caminho.
const OPEN_OVERLAY = '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"], [role="menu"][data-state="open"]'

function sameRect(a: Rect | null, b: Rect | null): boolean {
  if (!a || !b) return a === b
  return Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5
}

// Acha o componente [data-guide=target] (espera ele aparecer — a tela pode
// ainda estar carregando ou a pessoa pode estar editando) e acompanha a
// posição dele na tela. null = não está visível agora.
function useTargetRect(target: string, onFound: (el: HTMLElement) => void): Rect | null {
  const [rect, setRect] = useState<Rect | null>(null)
  const onFoundRef = useRef(onFound)
  onFoundRef.current = onFound

  useEffect(() => {
    let frame = 0
    let element: HTMLElement | null = null
    let last: Rect | null = null

    const tick = () => {
      // O mesmo alvo pode existir duas vezes (o "+" do menu no celular e o do
      // canto no desktop): vale o que está visível.
      if (!element || !element.isConnected || element.getBoundingClientRect().width === 0) {
        const candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-guide="${target}"]`))
        const visible = candidates.find((el) => el.getBoundingClientRect().width > 0) ?? null
        if (visible && visible !== element) onFoundRef.current(visible)
        element = visible
      }
      let next: Rect | null = null
      if (element && !document.querySelector(OPEN_OVERLAY)) {
        const r = element.getBoundingClientRect()
        if (r.width > 0 && r.height > 0) next = { top: r.top, left: r.left, width: r.width, height: r.height }
      }
      if (!sameRect(last, next)) {
        last = next
        setRect(next)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return rect
}

interface CoachmarkProps {
  step: GuideStep
  index: number
  total: number
  // "Entendi" (ack) ou "pular este passo" (action).
  onPrimary: () => void
  // "Sair do guia": não mostra mais este roteiro.
  onSkipTour: () => void
}

// Um componente em destaque: a tela escurece em volta, um anel brilha no
// componente e o balão explica. A tela continua clicável — num passo de ação a
// pessoa faz a própria ação no componente em destaque. Esc esconde a dica até
// a próxima vez que a tela abrir.
export function Coachmark({ step, index, total, onPrimary, onSkipTour }: CoachmarkProps) {
  const reduceMotion = useReducedMotion()
  const [hidden, setHidden] = useState(false)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [tooltipSize, setTooltipSize] = useState({ width: 320, height: 160 })
  const titleId = `guide-title-${step.id}`
  const bodyId = `guide-body-${step.id}`

  const rect = useTargetRect(step.target, (el) => {
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" })
    el.setAttribute("aria-describedby", bodyId)
  })

  useEffect(() => {
    setHidden(false)
  }, [step.id])

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    update()
    window.addEventListener("resize", update)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHidden(true)
    }
    window.addEventListener("keydown", onKey)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("keydown", onKey)
    }
  }, [])

  useLayoutEffect(() => {
    const el = tooltipRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    if (Math.abs(width - tooltipSize.width) > 0.5 || Math.abs(height - tooltipSize.height) > 0.5) setTooltipSize({ width, height })
  })

  if (typeof document === "undefined" || hidden || !rect || viewport.width === 0) return null

  const spot = { top: rect.top - PADDING, left: rect.left - PADDING, width: rect.width + PADDING * 2, height: rect.height + PADDING * 2 }
  const pos = tooltipPosition({ target: spot, tooltip: tooltipSize, viewport })
  const isAction = step.mode === "action"

  return createPortal(
    <AnimatePresence>
      <motion.div
        key={step.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.25 }}
        className="pointer-events-none fixed inset-0 z-70"
      >
        {/* Escurece tudo menos o componente (a sombra gigante é o "véu"). */}
        <div
          aria-hidden
          className="absolute rounded-2xl transition-[top,left,width,height] duration-200"
          style={{ ...spot, boxShadow: "0 0 0 9999px var(--guide-scrim)" }}
        />
        {/* Anel que brilha em volta do componente. */}
        <motion.div
          aria-hidden
          className="absolute rounded-2xl border-2 border-(--guide-ring)"
          style={spot}
          animate={reduceMotion ? undefined : { boxShadow: ["0 0 0 0 var(--guide-glow)", "0 0 0 10px transparent"] }}
          transition={reduceMotion ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeOut" }}
        />

        <motion.div
          ref={tooltipRef}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          initial={{ opacity: 0, y: pos.placement === "below" ? -6 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : 0.1 }}
          className="pointer-events-auto absolute w-[min(320px,calc(100vw-32px))] rounded-2xl border border-border bg-background p-4 shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          <span
            aria-hidden
            className="absolute h-3 w-3 rotate-45 border-border bg-background"
            style={{
              left: pos.arrowLeft - 6,
              ...(pos.placement === "below"
                ? { top: -6.5, borderLeftWidth: 1, borderTopWidth: 1 }
                : { bottom: -6.5, borderRightWidth: 1, borderBottomWidth: 1 }),
            }}
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground tabular-nums">
              Passo {index + 1} de {total}
            </span>
            <button
              type="button"
              onClick={onSkipTour}
              className="-mr-1 inline-flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              Sair do guia
              <X size={12} weight="bold" aria-hidden />
            </button>
          </div>
          <p id={titleId} className="mt-1.5 text-base font-semibold text-foreground text-balance">
            {step.title}
          </p>
          <p id={bodyId} className="mt-1 text-sm text-muted-foreground text-pretty">
            {step.body}
          </p>
          <div className="mt-3 flex items-center justify-end gap-2">
            {isAction ? (
              <button
                type="button"
                onClick={onPrimary}
                className="rounded-full px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              >
                {step.cta}
              </button>
            ) : (
              <button
                type="button"
                onClick={onPrimary}
                autoFocus
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-background hover:bg-primary/90"
              >
                {step.cta}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}
