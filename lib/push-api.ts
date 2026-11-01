// Chamadas de push (Web Push) — chave pública e assinatura do navegador.

import { fetchApi } from "./api"
import { subscriptionToJSON } from "./push"

export async function getPushPublicKey(): Promise<string | null> {
  const raw = await fetchApi("/push/public-key")
  return raw?.publicKey || null
}

export async function subscribePush(sub: PushSubscriptionJSON | { endpoint: string; keys?: { p256dh?: string; auth?: string } }): Promise<void> {
  const json = subscriptionToJSON({ endpoint: sub.endpoint ?? "", keys: sub.keys as { p256dh?: string; auth?: string } })
  await fetchApi("/push/subscribe", { method: "POST", body: JSON.stringify(json) })
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await fetchApi("/push/subscribe", { method: "DELETE", body: JSON.stringify({ endpoint }) })
}
