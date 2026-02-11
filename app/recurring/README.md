# Módulo de Recorrentes (Recurring)

Visualização segregada de Assinaturas (Recorrência fixa) e Compras Parceladas.

## Contexto

Diferente do módulo "Pending" (que foca na ação de pagar), este módulo foca na **visão geral dos contratos**: quais assinaturas tenho ativas e quanto falta pagar de minhas compras parceladas.

## Especificações Técnicas

### Seções

1. **Assinaturas & Fixas**: Itens com `recurrence != 'none'`. Exibe frequência (Mensal, Semanal) e valor.
2. **Compras Parceladas**: Itens com `installments > 1`. Exibe barra de progresso.

### Cálculos de Parcelamento

O módulo faz cálculos em tempo real para exibir o status da dívida:

- `installmentsLeft`: `Total - Atual + 1`
- `remainingDebt`: `ValorParcela * ParcelasRestantes`

## Regras de Negócio

1. **Apenas Pendentes**: O controlador busca dados via `getPendingTransactions()`. Transações finalizadas não aparecem aqui.
2. **Agrupamento**: Similar ao módulo Pending, exibe apenas uma instância representativa da série recorrente/parcelada.

## Interface

- **Barra de Progresso**: Visualiza graficamente o avanço do pagamento de parcelas (`width: (current/total)%`).

## API / Events

Leitura apenas (`Read-Only view`). Não realiza modificações diretas nas transações (usa-se o menu Pending ou Detalhes para isso).
