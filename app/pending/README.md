# Módulo Pendências (Pending)

Gestão centralizada de contas a pagar e receber ("Contas do Mês").

## Contexto

Permite ao usuário visualizar o que está planejado para vencer, dar baixa (efetivar pagamento) ou cancelar transações agendadas. É o coração do controle de fluxo de caixa futuro.

## Especificações Técnicas

### Lógica de Agrupamento ("Rei da Colina")

Para evitar poluição visual com repetições infinitas de transações recorrentes ou parceladas, o módulo usa uma lógica de filtragem (`useMemo`):

1. **Filtra**: Remove transações de cartão de crédito (geridas em [Invoices](../invoices/README.md)).
2. **Agrupa**: Identifica transações repetidas pelo `recurrenceId` ou `description`.
3. **Seleciona**: Exibe APENAS a instância mais antiga (`t.date`) de cada grupo. Isso garante que o usuário veja apenas a *próxima* conta a vencer, e não as de 2030.

### Ações

- **Baixar (Mark as Paid)**: Abre opções para definir `confirmDate` (data real do pagamento) e selecionar `cardId` (conta de origem/destino).
- **Cancelar**: Remove a transação do planejamento.

## Regras de Negócio

1. **Baixa de Parcelas**:
   - O sistema detecta se é uma parcela (`installments > 1`).
   - Exibe alerta visual informando que apenas a parcela atual (`currentInst`) será paga.
   - A próxima parcela aparecerá automaticamente no mês seguinte devido à lógica de data.
2. **Obrigatoriedade de Conta**: Para dar baixa, é OBRIGATÓRIO selecionar uma conta (Wallet) de origem/destino se houver contas cadastradas.

## API / Events

| Evento | Função | Descrição |
| :--- | :--- | :--- |
| **Baixar** | `markTransactionAsPaid` | Atualiza status para `paid` e define `paymentDate` |
| **Cancelar** | `cancelTransaction` | Remove do array de transações |

## Diretrizes de Uso

### Snippet: Agrupamento

```typescript
if (!existing || new Date(t.date) < new Date(existing.date)) {
  grouped.set(groupId, t) // Mantém apenas a mais antiga (próxima a vencer)
}
```
