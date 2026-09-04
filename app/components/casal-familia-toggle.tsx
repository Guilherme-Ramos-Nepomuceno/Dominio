"use client"

import { Heart, UsersThree } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

export function CasalFamiliaToggle({
    viewMode,
    onChange,
}: {
    viewMode: "casal" | "familia"
    onChange: (mode: "casal" | "familia") => void
}) {
    return (
        <div className="flex justify-center mb-6">
            <div className="bg-card p-1 rounded-xl border border-border inline-flex shadow-sm">
                <button
                    onClick={() => onChange("casal")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        viewMode === "casal" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                >
                    <Heart size={16} weight={viewMode === "casal" ? "fill" : "regular"} /> Casal
                </button>
                <button
                    onClick={() => onChange("familia")}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        viewMode === "familia" ? "bg-foreground text-background shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                >
                    <UsersThree size={16} weight={viewMode === "familia" ? "fill" : "regular"} /> Total da Família
                </button>
            </div>
        </div>
    )
}
