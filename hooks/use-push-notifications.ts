"use client"

import { useCallback, useEffect, useState } from "react"
import { ApiError } from "@/lib/api"
import { getPushPublicKey, subscribePush, unsubscribePush } from "@/lib/push-api"
import {
  DEFAULT_NOTIFICATION_PREFS,
  isIOS,
  pushSupport,
  urlBase64ToUint8Array,
  type NotificationPrefs,
  type PushSupport,
} from "@/lib/push"
import { getSettings, setSettings } from "@/lib/storage"
import { trackEvent } from "@/lib/events"
import { toast } from "@/hooks/use-toast"

function detectSupport(): PushSupport {
  if (typeof window === "undefined") return "unsupported"
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
  return pushSupport({
    hasServiceWorker: "serviceWorker" in navigator,
    hasPushManager: "PushManager" in window,
    hasNotification: "Notification" in window,
    ios: isIOS(navigator.userAgent, navigator.maxTouchPoints),
    standalone: !!standalone,
  })
}

// Estado das notificações push neste aparelho: suporte, permissão, assinatura
// e quais avisos a pessoa quer (preferências ficam nas Configurações da conta).
export function usePushNotifications() {
  const [support, setSupport] = useState<PushSupport>("unsupported")
  const [publicKey, setPublicKey] = useState<string | null | undefined>(undefined)
  const [permission, setPermission] = useState<NotificationPermission>("default")
  const [subscribed, setSubscribed] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS)
  const [isBusy, setIsBusy] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const s = detectSupport()
    setSupport(s)
    if (typeof Notification !== "undefined") setPermission(Notification.permission)

    const load = async () => {
      try {
        const [key, settings] = await Promise.all([getPushPublicKey().catch(() => null), getSettings().catch(() => null)])
        if (cancelled) return
        setPublicKey(key)
        if (settings?.notificationPrefs) setPrefs(settings.notificationPrefs)
        if (s === "supported") {
          const registration = await navigator.serviceWorker.getRegistration()
          const existing = await registration?.pushManager.getSubscription()
          if (!cancelled) setSubscribed(!!existing)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const enable = useCallback(async () => {
    if (!publicKey || support !== "supported") return
    setIsBusy(true)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== "granted") {
        toast({
          title: "Notificações bloqueadas",
          description: "Libere as notificações do Domínio nas configurações do navegador para ativar.",
          variant: "destructive",
        })
        return
      }
      const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"))
      await navigator.serviceWorker.ready
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
        }))
      await subscribePush(subscription.toJSON() as { endpoint: string; keys?: { p256dh?: string; auth?: string } })
      setSubscribed(true)
      trackEvent("push_enabled")
      toast({ title: "Notificações ativadas", description: "Você vai receber os avisos que escolher abaixo.", variant: "success" })
    } catch (error: any) {
      // 503: o servidor ainda não tem as chaves de push — trata como indisponível.
      if (error instanceof ApiError && error.status === 503) {
        setPublicKey(null)
        toast({ title: "Notificações indisponíveis", description: "O servidor ainda não está pronto para enviar notificações." })
        return
      }
      console.error("Falha ao ativar push:", error)
      toast({ title: "Não foi possível ativar as notificações", description: error?.message, variant: "destructive" })
    } finally {
      setIsBusy(false)
    }
  }, [publicKey, support])

  const disable = useCallback(async () => {
    setIsBusy(true)
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await unsubscribePush(subscription.endpoint).catch(() => {})
        await subscription.unsubscribe()
      }
      setSubscribed(false)
    } catch (error: any) {
      toast({ title: "Não foi possível desativar", description: error?.message, variant: "destructive" })
    } finally {
      setIsBusy(false)
    }
  }, [])

  const updatePref = useCallback(
    async (key: keyof NotificationPrefs, value: boolean) => {
      const previous = prefs
      const next = { ...prefs, [key]: value }
      setPrefs(next)
      try {
        await setSettings({ notificationPrefs: next })
      } catch (error: any) {
        setPrefs(previous)
        toast({ title: "Não foi possível salvar a preferência", description: error?.message, variant: "destructive" })
      }
    },
    [prefs],
  )

  return { support, publicKey, permission, subscribed, prefs, isBusy, isLoading, enable, disable, updatePref }
}
