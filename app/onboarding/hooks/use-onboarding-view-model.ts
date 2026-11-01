"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"
import { useSelectedMonth } from "@/lib/selected-month-context"
import { confirmPlan, createWish, getPlan, updatePlan } from "@/lib/planning-api"
import { nextOnboardingStep, onboardingDoneKey, onboardingPendingKey, type OnboardingStep } from "@/lib/onboarding"
import { formatMoneyInput, parseMoneyInput, type Plan } from "@/lib/plan"
import { parseMonthKey } from "@/lib/period"
import { trackEvent } from "@/lib/events"
import { toast } from "@/hooks/use-toast"

export function useOnboardingViewModel() {
  const router = useRouter()
  const { currentMonth } = useSelectedMonth()
  const { year, month } = parseMonthKey(currentMonth)
  const [step, setStep] = useState<OnboardingStep>("income")
  const [plan, setPlan] = useState<Plan | null>(null)
  const [income, setIncome] = useState("")
  const [wishName, setWishName] = useState("")
  const [wishAmount, setWishAmount] = useState("")
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPlan(year, month)
      .then((p) => {
        if (cancelled) return
        setPlan(p)
        // Pré-preenche com a renda prevista que o backend já conhece.
        const suggested = p.budgetAmount ?? p.suggestedBudget
        if (suggested > 0) setIncome((current) => current || formatMoneyInput(suggested))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [year, month])

  const finish = useCallback(() => {
    const user = getCurrentUser()
    if (user) {
      try {
        localStorage.setItem(onboardingDoneKey(user.id), "1")
        localStorage.removeItem(onboardingPendingKey(user.id))
      } catch {
        // sem storage, no pior caso a Home volta a oferecer o onboarding
      }
    }
    router.push("/")
  }, [router])

  const advance = useCallback(() => {
    setError(null)
    const next = nextOnboardingStep(step)
    if (next) setStep(next)
    else finish()
  }, [step, finish])

  const saveIncome = useCallback(async () => {
    const value = parseMoneyInput(income)
    if (value === null || value <= 0) return setError("Informe quanto você espera receber no mês.")
    setIsBusy(true)
    try {
      setPlan(await updatePlan(year, month, { budgetAmount: value, budgetSource: "MANUAL" }))
      advance()
    } catch (e: any) {
      setError(e?.message || "Não foi possível salvar agora.")
    } finally {
      setIsBusy(false)
    }
  }, [income, year, month, advance])

  const confirmDraft = useCallback(async () => {
    setIsBusy(true)
    try {
      setPlan(await confirmPlan(year, month))
      trackEvent("plan_confirmed", { onboarding: true })
      advance()
    } catch (e: any) {
      toast({ title: "Não foi possível confirmar o plano", description: e?.message, variant: "destructive" })
    } finally {
      setIsBusy(false)
    }
  }, [year, month, advance])

  const saveWish = useCallback(async () => {
    const value = parseMoneyInput(wishAmount)
    if (!wishName.trim()) return setError("Dê um nome ao desejo.")
    if (value === null || value <= 0) return setError("Informe quanto deve custar.")
    setIsBusy(true)
    try {
      await createWish({ name: wishName.trim(), estimatedAmount: value, year, month })
      trackEvent("wish_created", { onboarding: true })
      finish()
    } catch (e: any) {
      setError(e?.message || "Não foi possível salvar o desejo.")
    } finally {
      setIsBusy(false)
    }
  }, [wishName, wishAmount, year, month, finish])

  return {
    step,
    plan,
    income,
    setIncome,
    wishName,
    setWishName,
    wishAmount,
    setWishAmount,
    isBusy,
    error,
    saveIncome,
    confirmDraft,
    saveWish,
    advance,
    skipAll: finish,
  }
}
