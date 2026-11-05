"use client"

import type React from "react"
import { useEffect } from "react"
import { X } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface FormSheetProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  // Rodapé fixo (normalmente o botão principal), separado do conteúdo que rola.
  footer?: React.ReactNode
  // Com onSubmit, a folha vira um <form> (Enter envia).
  onSubmit?: (e: React.FormEvent) => void
  className?: string
}

// Folha que sobe de baixo no celular (centralizada no computador), no desenho
// das telas novas: fundo da página, título discreto, conteúdo com respiro e o
// botão principal num rodapé próprio. Fecha com Esc ou tocando fora.
export function FormSheet({ title, onClose, children, footer, onSubmit, className }: FormSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  const Shell = onSubmit ? "form" : "div"

  return (
    <div className="fixed inset-0 z-100 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <Shell
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onSubmit={onSubmit}
        className={cn(
          "bg-background w-full max-w-md rounded-t-3xl md:rounded-3xl border-t border-border md:border max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200 motion-reduce:animate-none",
          className,
        )}
      >
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-6 space-y-8 md:px-8 md:pt-7">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Fechar" className="p-2 -mr-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              <X size={18} weight="bold" />
            </button>
          </div>
          {children}
        </div>
        {footer && <div className="border-t border-border/60 px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-8 md:pb-7">{footer}</div>}
      </Shell>
    </div>
  )
}

// Botão principal do rodapé.
export function SheetPrimaryButton({
  children,
  disabled,
  onClick,
  type = "submit",
}: {
  children: React.ReactNode
  disabled?: boolean
  onClick?: () => void
  type?: "submit" | "button"
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl bg-foreground py-3 text-sm font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50"
    >
      {children}
    </button>
  )
}

// Campo de texto sublinhado, sem caixa.
export function UnderlineInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full border-b border-border bg-transparent py-1.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:border-foreground focus:outline-none",
        className,
      )}
    />
  )
}
