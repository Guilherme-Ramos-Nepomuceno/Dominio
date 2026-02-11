# Módulo de Transferências (Transfer)

Sistema de movimentação de saldo entre contas de débito.

## Contexto

Realiza a transferência de fundos criando um par contábil de transações (Saída da Origem + Entrada no Destino).

## Especificações Técnicas

### Validações (`Guard Clauses`)

- Exige no mínimo **2 cartões de débito** cadastrados.
- Bloqueia se Origem for igual a Destino.
- Bloqueia valores <= 0.
- Mostra "Tela de Erro/Empty State" amigável se o usuário não tiver cartões suficientes.

### Input Inteligente

- **Money Input**: Formatação automática de moeda (R$) enquanto digita.
- **Quick Amounts**: Botões de atalho (+10, +50, +100) para preenchimento rápido.

## Regras de Negócio

1. **Transação Dupla**:
   - Cria uma transação `expense` na conta de origem (`categoryId: "transfer_income"` - *legacy naming*).
   - Cria uma transação `income` na conta de destino (`categoryId: "transfer_expense"`).
2. **Restrição de Tipo**: Apenas contas de DÉBITO (`debit`) podem transferir. Cartões de crédito não participam dessa lógica (pagamento de fatura é outro fluxo).

## API / Events

| Ação | Efeito no Storage |
| :--- | :--- |
| **Submit** | `addTransaction(expense)` E `addTransaction(income)` sequencialmente. |

## Diretrizes de Uso

Interface focada em "Wizard" passo-a-passo no mesmo formulário (Origem -> Destino -> Valor).
