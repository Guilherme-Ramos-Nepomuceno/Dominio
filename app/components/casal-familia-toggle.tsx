"use client"

import { cn } from "@/lib/utils"

// Conta do casal: ver só o casal ou o total da família. Controle segmentado
// pequeno, no mesmo desenho dos filtros das telas novas.
export function CasalFamiliaToggle({
    viewMode,
    onChange,
}: {
    viewMode: "casal" | "familia"
    onChange: (mode: "casal" | "familia") => void
}) {
    return (
        <div role="radiogroup" aria-label="Ver" className="inline-flex rounded-full bg-muted/50 p-0.5 text-xs font-medium">
            {([
                ["casal", "Casal"],
                ["familia", "Total da família"],
            ] as const).map(([value, label]) => (
                <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={viewMode === value}
                    onClick={() => onChange(value)}
                    className={cn(
                        "rounded-full px-3 py-1 transition-colors",
                        viewMode === value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
                    )}
                >
                    {label}
                </button>
            ))}
        </div>
    )
}
