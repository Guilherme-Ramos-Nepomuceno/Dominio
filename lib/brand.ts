// Nome e frases da marca (ADR-030). Cada frase tem um papel fixo e um lugar:
// - assinatura: sempre junto da marca (login, metadados, loja);
// - explicação: primeira tela de quem chega (criar conta, descrição do app);
// - chamada: ritual do começo do mês (notificação do dia 1, na API);
// - conquista: plano confirmado e mês fechado no azul — só quando é verdade.
// Nenhuma tela mostra duas frases.

export const BRAND_NAME = "Domínio"
export const BRAND_SIGNATURE = "Seu mês no azul."
export const BRAND_EXPLANATION = "Ter domínio não é cortar tudo. É saber quanto dá pra gastar hoje."
export const BRAND_CALL = "Domine o mês. Fique no azul."
export const BRAND_ACHIEVEMENT = "Seu mês, seu domínio."

// Versão dos ícones na URL (?v=). Navegador e sistema guardam o ícone pelo
// endereço: sem mudar o endereço, quem salvou o app antes continuava vendo o
// ícone antigo. Ao redesenhar o ícone, suba o número.
export const BRAND_ICON_VERSION = 2
export const brandIconUrl = (path: string) => `${path}?v=${BRAND_ICON_VERSION}`

export interface ToastCopy {
  title: string
  description: string
}

// Aviso de mês fechado. No azul (sobra ≥ 0) leva a conquista; estourado fica
// neutro e olha para o próximo mês, sem bronca (ADR-010).
export function monthClosedToast(monthName: string, leftover: number, money: (value: number) => string): ToastCopy {
  if (leftover < -0.004) {
    return {
      title: `${monthName} fechado`,
      description: `Passou ${money(Math.abs(leftover))} do plano. O próximo mês começa do zero.`,
    }
  }
  return {
    title: `${monthName} fechou no azul`,
    description: leftover > 0.004 ? `Sobraram ${money(leftover)}. ${BRAND_ACHIEVEMENT}` : `Fechou no limite. ${BRAND_ACHIEVEMENT}`,
  }
}
