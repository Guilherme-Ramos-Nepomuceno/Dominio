// Service worker do Domínio. Só existe para o app ser instalável e receber
// notificações push — não guarda páginas nem dados em cache (tudo continua
// vindo da rede, como no navegador).

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// Payload enviado pelo backend: { title, body, url }.
self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }
  const title = data.title || "Domínio"
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
      lang: "pt-BR",
    }),
  )
})

// Abre (ou foca) o app na URL da notificação.
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const target = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin)
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of windows) {
        if (new URL(client.url).origin === target.origin) {
          await client.focus()
          if ("navigate" in client) await client.navigate(target.href)
          return
        }
      }
      await self.clients.openWindow(target.href)
    })(),
  )
})
