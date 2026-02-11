# Módulo Nova Transação (New)

Wrapper simplificado para criação rápida de transações.

## Contexto

Página dedicada exclusivamente à inserção de dados, focada em simplicidade e foco, diferente de modais que aparecem sobre outro conteúdo.

## Especificações Técnicas

- **Rota**: `/app/new`
- **Controller**: `NewTransactionPage`
- **Dependência**: Reutiliza integralmente o componente `TransactionForm` (`@/components/forms/transaction-form`).

## Regras de Negócio

- A lógica de validação, seleção de categoria e persistência reside inteiramente no componente `TransactionForm`. Esta página atua apenas como container de layout (`AppLayout`).

## Ver também

- [Documentação de Componentes (TODO)](../../components/README.md) - Verificar `TransactionForm` para detalhes da lógica de input ("expense" vs "income", parcelamento, recorrência).
