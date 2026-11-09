"use client"

import type React from "react"
import { useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface ExpandableTextProps {
  children: React.ReactNode
  className?: string
  as?: "p" | "span"
}

// Texto numa linha só, com "..." quando não cabe — no celular, tocar abre o
// texto inteiro (e tocar de novo fecha). Só vira clicável quando de fato está
// cortado; o toque não chega na linha em volta (ex.: um <label> de checkbox).
export function ExpandableText({ children, className, as: Tag = "p" }: ExpandableTextProps) {
  const ref = useRef<HTMLElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el || expanded) return
    const check = () => setIsTruncated(el.scrollWidth > el.clientWidth + 1)
    check()
    const observer = new ResizeObserver(check)
    observer.observe(el)
    return () => observer.disconnect()
  }, [children, expanded])

  const clickable = isTruncated || expanded
  const toggle = (e: React.SyntheticEvent) => {
    if (!clickable) return
    e.preventDefault()
    e.stopPropagation()
    setExpanded((v) => !v)
  }

  return (
    <Tag
      ref={ref as React.Ref<HTMLParagraphElement & HTMLSpanElement>}
      onClick={toggle}
      onKeyDown={(e: React.KeyboardEvent) => (e.key === "Enter" || e.key === " ") && toggle(e)}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-expanded={clickable ? expanded : undefined}
      title={isTruncated && !expanded && typeof children === "string" ? children : undefined}
      className={cn(expanded ? "whitespace-normal break-words" : "truncate", clickable && "cursor-pointer", className)}
    >
      {children}
    </Tag>
  )
}
