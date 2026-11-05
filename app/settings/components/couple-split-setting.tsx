"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { updateFamilySettings } from "@/lib/family"
import { SPLIT_MODE_HINT, SPLIT_MODE_LABEL, type CoupleSplitMode } from "@/lib/couple-split"
import { useAccount } from "@/components/account/account-context"
import { useToast } from "@/hooks/use-toast"

const MODES: CoupleSplitMode[] = ["TOGETHER", "PROPORTIONAL", "HALF"]

// Como o casal divide as contas fixas marcadas "do casal". Vale para os dois
// e salva na hora (mesmo desenho da opção da semana).
export function CoupleSplitSetting() {
  const { family, refreshFamily, isReadOnly } = useAccount()
  const { toast } = useToast()
  const [saving, setSaving] = useState<CoupleSplitMode | null>(null)
  const current = family?.family?.coupleSplitMode ?? "TOGETHER"

  const choose = async (mode: CoupleSplitMode) => {
    if (mode === current || saving) return
    setSaving(mode)
    try {
      await updateFamilySettings({ coupleSplitMode: mode })
      await refreshFamily()
      toast({ title: "Divisão do casal atualizada", description: `Agora: ${SPLIT_MODE_LABEL[mode]}.`, variant: "success" })
    } catch (error: any) {
      toast({ title: "Não foi possível salvar", description: error.message || "Tente de novo.", variant: "destructive" })
    } finally {
      setSaving(null)
    }
  }

  return (
    <fieldset id="divisao-casal" className="scroll-mt-24 py-3.5" disabled={isReadOnly}>
      <legend className="mb-1 text-sm font-medium text-foreground">Como vocês dividem as contas fixas do casal</legend>
      <p className="mb-2 text-xs text-muted-foreground">Vale para os dois. Entram as despesas do casal que se repetem todo mês ou são parceladas.</p>
      <div className="grid gap-2">
        {MODES.map((mode) => {
          const active = (saving ?? current) === mode
          return (
            <label
              key={mode}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors",
                active ? "border-foreground/60" : "border-border hover:border-muted-foreground/40",
              )}
            >
              <input
                type="radio"
                name="couple-split"
                value={mode}
                checked={active}
                onChange={() => choose(mode)}
                className="mt-0.5 accent-primary"
              />
              <span>
                <span className="block text-sm font-medium text-foreground">{SPLIT_MODE_LABEL[mode]}</span>
                <span className="block text-xs text-muted-foreground">{SPLIT_MODE_HINT[mode]}</span>
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
