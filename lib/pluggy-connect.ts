// Abre o widget Pluggy Connect só com o conector MeuPluggy. No plano gratuito
// da Pluggy, criar item pela API é bloqueado ("Free subscription can only
// create items through our Connect Widget") — o widget é o caminho. Ver
// ADR-025 no dominio-api.
//
// O SDK (~900 KB com o zoid) só é baixado quando a pessoa toca em conectar.

// Id do conector MeuPluggy na Pluggy (conferido numa conta gratuita em 2026-11).
export const MEU_PLUGGY_CONNECTOR_ID = 200

export interface OpenPluggyConnectOptions {
  connectToken: string
  onSuccess: (pluggyItemId: string) => void | Promise<void>
  onError: (message: string) => void
  onClose?: () => void
}

export async function openPluggyConnect({ connectToken, onSuccess, onError, onClose }: OpenPluggyConnectOptions): Promise<void> {
  const { PluggyConnect } = await import("pluggy-connect-sdk")
  const isDark = document.documentElement.classList.contains("dark")

  let widget: InstanceType<typeof PluggyConnect> | null = null
  // Fecha e solta o iframe — senão o próximo "Conectar" abre dois widgets.
  // Fora do callback do widget (setTimeout): destruir o iframe de dentro de
  // um evento dele mesmo pode cortar a mensagem no meio.
  const dispose = () => {
    const current = widget
    widget = null
    if (current) setTimeout(() => current.destroy().catch(() => {}), 0)
  }

  widget = new PluggyConnect({
    connectToken,
    connectorIds: [MEU_PLUGGY_CONNECTOR_ID],
    selectedConnectorId: MEU_PLUGGY_CONNECTOR_ID,
    language: "pt",
    theme: isDark ? "dark" : "light",
    onSuccess: async ({ item }) => {
      dispose()
      await onSuccess(item.id)
    },
    // O widget mostra o erro com opção de tentar de novo — não fecha aqui.
    onError: ({ message }) => onError(message),
    onClose: () => {
      dispose()
      onClose?.()
    },
  })
  await widget.init()
}
