"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "./select"

export interface AppSelectOption {
  value: string
  label: ReactNode
  // Opções com o mesmo grupo aparecem juntas, sob esse título (ex: "Despesas").
  group?: string
}

interface AppSelectProps {
  value: string
  onChange: (value: string) => void
  options: AppSelectOption[]
  // Opção para o valor vazio ("Sem categoria", "Todos"...). Sem ela, o vazio
  // só aparece como `placeholder` e não dá para voltar a ele pela lista.
  emptyLabel?: ReactNode
  placeholder?: ReactNode
  // "field": largura cheia, na altura dos campos de formulário.
  // "pill": do tamanho do texto, para usar dentro de uma linha.
  variant?: "field" | "pill"
  id?: string
  disabled?: boolean
  required?: boolean
  className?: string
  "aria-label"?: string
}

// O Radix não aceita "" como valor de item — o vazio vira esta chave por dentro.
const EMPTY = "__empty__"

// Seletor único do app: mesma pílula/campo e a mesma lista (tema do app, ✓ na
// escolhida) em todas as telas, no lugar do <select> nativo do sistema.
export function AppSelect({
  value,
  onChange,
  options,
  emptyLabel,
  placeholder,
  variant = "field",
  id,
  disabled,
  required,
  className,
  "aria-label": ariaLabel,
}: AppSelectProps) {
  const groups: { name: string | undefined; items: AppSelectOption[] }[] = []
  for (const option of options) {
    const last = groups[groups.length - 1]
    if (last && last.name === option.group) last.items.push(option)
    else groups.push({ name: option.group, items: [option] })
  }

  const current = value === "" ? (emptyLabel !== undefined ? EMPTY : "") : value

  return (
    <Select
      value={current}
      onValueChange={(v) => onChange(v === EMPTY ? "" : v)}
      disabled={disabled}
      required={required}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn(variant === "field" ? "h-12 w-full rounded-xl px-4 text-base" : "max-w-full", "min-w-0 [&>span]:truncate", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align={variant === "pill" ? "end" : "start"} className="max-h-72">
        {emptyLabel !== undefined && (
          <>
            <SelectItem value={EMPTY} className="text-muted-foreground">
              {emptyLabel}
            </SelectItem>
            {options.length > 0 && <SelectSeparator />}
          </>
        )}
        {groups.map((g, i) =>
          g.name ? (
            <SelectGroup key={`${g.name}-${i}`}>
              <SelectLabel>{g.name}</SelectLabel>
              {g.items.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : (
            g.items.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))
          ),
        )}
      </SelectContent>
    </Select>
  )
}
