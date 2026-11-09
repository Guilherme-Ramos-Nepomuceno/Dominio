import { Export, PlusSquare, DeviceMobile } from "@phosphor-icons/react"

// Passo a passo para instalar o Domínio na tela inicial do iPhone — sem isso o
// iOS não entrega notificações push (iOS 16.4 ou mais novo).
export function IosInstallSteps({ lastStep = "Abra o Domínio pelo ícone e volte aqui para ativar." }: { lastStep?: string }) {
  return (
    <ol className="space-y-2 text-sm">
      <li className="flex items-center gap-2">
        <Export size={18} className="text-muted-foreground shrink-0" aria-hidden />
        <span>
          Toque em <strong>Compartilhar</strong> no Safari.
        </span>
      </li>
      <li className="flex items-center gap-2">
        <PlusSquare size={18} className="text-muted-foreground shrink-0" aria-hidden />
        <span>
          Escolha <strong>Adicionar à Tela de Início</strong>.
        </span>
      </li>
      <li className="flex items-center gap-2">
        <DeviceMobile size={18} className="text-muted-foreground shrink-0" aria-hidden />
        <span>{lastStep}</span>
      </li>
    </ol>
  )
}
