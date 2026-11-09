// Notificações push (Web Push): helpers puros — detecção de suporte/iOS e
// conversão da chave pública VAPID. Testável com node:test.

export interface NotificationPrefs {
  weekStart: boolean
  weekly80: boolean
  monthPlan: boolean
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = { weekStart: true, weekly80: true, monthPlan: true }

export function mapNotificationPrefs(raw: any): NotificationPrefs {
  return {
    weekStart: raw?.weekStart ?? DEFAULT_NOTIFICATION_PREFS.weekStart,
    weekly80: raw?.weekly80 ?? DEFAULT_NOTIFICATION_PREFS.weekly80,
    monthPlan: raw?.monthPlan ?? DEFAULT_NOTIFICATION_PREFS.monthPlan,
  }
}

// Chave VAPID em base64url → bytes para pushManager.subscribe.
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

// iPhone/iPad (iPadOS se apresenta como Mac com toque).
export function isIOS(userAgent: string, maxTouchPoints = 0): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1
}

export type PushSupport =
  | "supported"
  // iOS fora da tela inicial: precisa instalar o app (iOS 16.4+).
  | "ios-needs-install"
  | "unsupported"

export function pushSupport(env: {
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
  ios: boolean
  standalone: boolean
}): PushSupport {
  if (env.ios && !env.standalone) return "ios-needs-install"
  if (env.hasServiceWorker && env.hasPushManager && env.hasNotification) return "supported"
  return "unsupported"
}

export function subscriptionToJSON(sub: { endpoint: string; keys?: { p256dh?: string; auth?: string } }) {
  return { endpoint: sub.endpoint, keys: { p256dh: sub.keys?.p256dh ?? "", auth: sub.keys?.auth ?? "" } }
}

// Vale oferecer os avisos aqui? Push disponível no servidor e ainda não
// ativado neste aparelho (no iPhone fora da tela inicial: instalar o app).
export function shouldOfferNotify(env: {
  publicKey: string | null | undefined
  support: PushSupport
  subscribed: boolean
}): boolean {
  if (!env.publicKey) return false
  if (env.support === "ios-needs-install") return true
  return env.support === "supported" && !env.subscribed
}
