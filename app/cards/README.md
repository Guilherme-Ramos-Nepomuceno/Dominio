# Módulo de Cartões (Cards)

Este módulo gerencia a criação, visualização e exclusão de cartões de crédito e débito, servindo como ponto central para a organização das contas do usuário.

## Contexto

Permite ao usuário manter múltiplos cartões, visualizando o saldo (conta corrente) ou o gasto atual da fatura (cartão de crédito).

## Especificações Técnicas

Este módulo utiliza o padrão **MVVM**:

- **View**: `CardsView` (`components/cards-view.tsx`)
- **ViewModel**: `useCardsViewModel` (`hooks/use-cards-view-model.ts`)
- **UI Components**: `CardItem`, `AddCardDialog` (localizados em `components/`)

### Data Layer

- **Source**: `lib/storage`
- **Functions**: `getCards()`, `deleteCard()`, `getAccountBalance()`.

## Regras de Negócio

1. **Cálculo de Saldo**:
   - **Crédito**: o valor de cada cartão é a **fatura aberta** (`card.openInvoice`, a que recebe as compras de hoje), e o topo soma todas em "A pagar nos cartões". Cartão ligado ao banco só conta o que veio do banco (mais a fila de revisão); lançamento manual fica fora do total. O toque abre essa fatura (`/invoices?card=…&month=AAAA-MM`). A barra é o limite em uso informado pelo banco. Ver ADR-027.
   - **Débito**: Saldo da conta (`accountBalance`) calculado via movimentações.
2. **Exclusão**:
   - Só é permitida após confirmação em modal (`AlertDialog`).
   - *Atenção*: Excluir um cartão pode afetar o histórico de transações vinculadas.

## API / Events

| Evento | Ação | Payload Exemplo |
| :--- | :--- | :--- |
| **Create Card** | `storage.addCard(card)` | `{ name: "NuBank", limit: 5000, type: "credit" }` |
| **Delete Card** | `storage.deleteCard(id)` | `id: "uuid-v4..."` |

## Diretrizes de Uso

### Exemplo de Delete

```typescript
const confirmDeleteCard = () => {
  if (cardToDelete) {
    deleteCard(cardToDelete)
    toast({ title: "Cartão removido", variant: "success" })
  }
}
```
