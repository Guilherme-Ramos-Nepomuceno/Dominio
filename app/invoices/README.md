# Módulo de Faturas (Invoices)

Sistema avançado de visualização de faturas de cartão de crédito, com suporte a parcelamento e projeção de gastos futuros.

## Contexto

Centraliza o controle de dívidas de crédito, permitindo ao usuário entender quanto deve pagar no mês atual e projetar o impacto de compras parceladas nos meses seguintes.

## Especificações Técnicas

### Lógica de Projeção (Core)

O módulo possui uma lógica complexa para "explodir" transações parceladas em instâncias virtuais mensais.

- A função calcula o `monthDiff` entre a data da compra e o mês selecionado.
- Se `0 <= monthDiff < installments`, a transação é exibida no mês selecionado com o valor da parcela (`total / installments`).

### Componentes

- `InvoicesPage`: Controller que processa as transações brutas e gera a view mensal.
- `PeriodSelector`: Navegação entre meses.

## Regras de Negócio

1. **Parcelamento Inteligente**: Uma compra de R$1000 em 10x aparece como R$100 em cada um dos 10 meses subsequentes.
2. **Pagamento**:
   - **Total**: Paga todo o `totalPending` da fatura.
   - **Parcial**: Abate o valor das transações em ordem sequencial até cobrir o montante pago.
3. **Status**: Transações podem ser `pending` (a pagar) ou `paid` (pagas). Faturas totalmente pagas exibem indicador visual de "Check".

## API / Events

| Evento | Função | Descrição |
| :--- | :--- | :--- |
| **Pay Full** | `markTransactionAsPaid(id)` | Marca todas pendentes do mês como pagas |
| **Cancel** | `cancelTransaction(id)` | Estorna uma transação (ex: compra cancelada) |

## Diretrizes de Uso

### Snippet: Lógica de Parcelas

```typescript
// Exemplo simplificado da lógica de projeção
const monthDiff = (selYear - tYear) * 12 + (selMonth - tMonth)
if (monthDiff >= 0 && monthDiff < installments) {
   // Exibe parcela neste mês
   const amount = t.amount / installments
   const currentInstallment = monthDiff + 1
}
```
