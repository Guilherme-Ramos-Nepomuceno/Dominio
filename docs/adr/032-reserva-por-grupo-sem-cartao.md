# ADR-032: Reserva por grupo (Segurança, Planejado, Futuro), sem cartão obrigatório

- **Data**: 2026-11-19
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: reservas, objetivos, ui, modelo
- **Repositórios**: Dominio (telas e lib) e dominio-api (modelo e validação)
- **Origem**: [PRD-001](../prd/001-reservas-e-objetivos-simplificados.md), fatias 1 e 4

## Contexto e problema

Criar uma reserva pedia 6 campos, incluindo um cartão com débito que o backend exigia mas que não diz onde o dinheiro está. Os 5 tipos (Emergência, Viagem, Curto prazo, Longo prazo, Outra) misturavam propósito com prazo, e "Viagem" repete o que já é objetivo. Os diálogos de criar e editar estavam no desenho antigo (ADR-031 deixou como próximo passo).

## Decisão

- **Três grupos pelo propósito**, respondendo "quando eu mexo nesse dinheiro?": `SEGURANCA` (Segurança), `PLANEJADO` (Planejado), `FUTURO` (Futuro). `GUARDADO` é o estado sem destino e o padrão. Não pedimos anos ao usuário.
- **Tipos antigos não são reescritos** (ADR-024). Continuam no banco e são lidos como o grupo equivalente: `EMERGENCIA` → Segurança, `VIAGEM` e `CURTO_PRAZO` → Planejado, `LONGO_PRAZO` → Futuro, `OUTRO` → Guardado. O mapa existe nos dois lados (`utils/savings-kind.ts` na API, `normalizeSavingsKind` no front). A API aceita os valores antigos de um front desatualizado e grava sempre o novo.
- **Cartão deixa de ser obrigatório.** `SavingsGoal.cardId` fica anulável (mesmo caminho de `Transaction.categoryId`, ADR-005: só afrouxa). A API valida o cartão só quando ele vem.
- **Meta é opcional**: `targetAmount` zero significa reserva sem meta.
- **O grupo é sugerido pelo nome** ("emergência" → Segurança, "viagem" → Planejado...), pré-marcado e trocável. Sem acerto fica em Guardado. Nunca bloqueia salvar.
- **Reserva em `FormSheet`** (ADR-016): só o nome é obrigatório; saldo guardado e meta são opcionais; sem cartão e sem ícone (o ícone vem do grupo; reservas antigas mantêm o que escolheram).
- **Lista agrupada** por grupo com subtotal; a linha mostra só ícone, nome, saldo e meta. Editar, excluir, "separado para objetivos", banco e "Guardar ou retirar" ficam no detalhe, com confirmação de exclusão no lugar do diálogo do navegador.
- **Objetivo**: ao criar, o formulário tem "De onde vem o dinheiro", com o livre de cada reserva, e já separa na hora. O fluxo de primeiro acesso cai de três para dois passos. Um alternador (`PageSwitch`) liga Reservas e Objetivos, mantendo as duas rotas.

## Consequências

### Positivas

- Criar uma reserva passa a ser só dar um nome.
- Um front antigo continua funcionando com a API nova e o contrário (a ordem de publicação do ADR-012 não muda: API primeiro).

### Negativas

- Valores antigos ficam no banco até uma decisão à parte; leitores novos precisam passar por `normalizeSavingsKind`.
- A reserva padrão **Guardado** como entidade, as fontes de cada reserva, a visão "Tudo investido" e o ajuste automático de resgate (PRD-001, fatias 2 e 3) ainda não existem. Por isso o saldo continua sendo um número da reserva.
- Se a separação de algum valor falhar ao criar o objetivo, ele já existe; o app abre a tela de separar para tentar de novo.

## Links

- [ADR-013](013-pagina-corrida-sem-cartoes.md), [ADR-016](016-componentes-de-formulario-unicos.md), [ADR-031](031-reservas-alocadas-em-objetivos.md)
- [ADR-024](../../../dominio-api/docs/adr/024-migrations-somente-aditivas.md)
