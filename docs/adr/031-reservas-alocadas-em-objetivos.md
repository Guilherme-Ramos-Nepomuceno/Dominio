# ADR-031: Reservas separadas para objetivos, tipo da reserva e investimentos por tipo

- **Data**: 2026-11-18
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: reservas, objetivos, investimentos, ui
- **Repositórios**: Dominio (tela e lib) e dominio-api (modelo, regra e migração)

## Contexto e problema

Reservas (`SavingsGoal`) e objetivos (`Goal`) eram duas entidades sem relação. O progresso de um objetivo era um número digitado à mão (`currentAmount`), então a pessoa não via, nos objetivos, de onde vinha o dinheiro nem se ele já existia numa reserva. Além disso:

- Reserva não tinha tipo (emergência, viagem...), e os investimentos do banco (ADR-028) só apareciam como lista plana.
- A tela de objetivos ainda usava o desenho antigo (gradiente, cartões com sombra e diálogos próprios), fora da página corrida da ADR-013 e dos componentes da ADR-016.

## Decisão

### Reserva como ponte entre o dinheiro e o objetivo

- Uma reserva pode ser separada para **vários** objetivos. A separação é uma tabela nova, `GoalAllocation` (objetivo, reserva, valor), com unicidade por par.
- A soma do que uma reserva dá a todos os objetivos não passa do saldo dela. A API recusa (400) com o livre disponível na mensagem.
- O que sobra da reserva é **livre**, e não aparece em nenhum objetivo.
- O progresso de um objetivo (`currentAmount` na resposta) é a soma das alocações. O campo `Goal.currentAmount` do banco fica legado, sem leitura nem escrita. O front não envia mais progresso.
- Valor é absoluto: "quanto desta reserva vai para este objetivo". Zero tira a separação. Isso evita o erro de somar duas vezes ao editar.
- Apagar um objetivo só desfaz a separação; o dinheiro continua na reserva. Apagar uma reserva com separação remove a linha dela (cascata), e o objetivo perde esse valor.
- Reserva com separação não pode ter o saldo digitado abaixo do separado (400). Quando o saldo vem do banco (ADR-028), o sync não é bloqueado: se o saldo cair, o livre fica em zero e nunca negativo.

### Tipo da reserva

- Lista fixa, validada na API e no front: `EMERGENCIA`, `VIAGEM`, `CURTO_PRAZO`, `LONGO_PRAZO`, `OUTRO` (rótulo "Outra"). Padrão `OUTRO`, para reservas antigas.
- Aparece na reserva (texto ao lado do nome) e nos diálogos de criar e editar (seletor).

### Investimentos agrupados por tipo

- O banco manda `type` (FIXED_INCOME, SECURITY, MUTUAL_FUND, ETF, COE...). O front agrupa em Renda fixa, Ações, Fundos, ETFs, COE e Outros, nessa ordem, com o total de cada grupo. CDB, LCI e Tesouro caem em Renda fixa.
- O agrupamento é só de apresentação. Não muda o vínculo com reserva (ADR-028).

### Tela de objetivos no padrão novo

- Página corrida (ADR-013): total separado para objetivos em destaque, com "R$ X ainda livres nas suas reservas" logo abaixo.
- Cada objetivo mostra o progresso (barra neutra, verde só com a meta alcançada) e, abaixo, de quais reservas vem o dinheiro.
- Formulário e alocação em `FormSheet` (ADR-016), com seletor de reserva mostrando o livre de cada uma. Sem o campo "valor atual" no formulário de objetivo.
- Lógica pura em `lib/goal-allocation.ts`, com teste (ADR-022).

## Opções consideradas

- **Reserva → um objetivo só** (campo `goalId` na reserva). Mais simples, mas não cobre a reserva de emergência que também ajuda outro objetivo.
- **Objetivo guarda o próprio valor e a reserva só alimenta.** Duplica a fonte de verdade e deixa o número de um objetivo descolado do saldo real.
- **Mandar o progresso pelo front.** Descartado: o valor precisa bater com o saldo da reserva, que a API já confere.

## Consequências

### Positivas

- O número do objetivo sempre é a soma do dinheiro real separado para ele, sem digitação.
- A mesma reserva pode atender vários objetivos, sem contar dinheiro duas vezes.
- O tipo deixa a lista de reservas legível.

### Negativas

- **Progresso manual antigo não migra.** O `currentAmount` digitado nos objetivos existentes deixa de aparecer. Quem tinha valor manual precisa separá-lo de uma reserva. Não há migração automática, porque não há como saber de qual reserva veio o dinheiro.
- Mais uma tabela e mais uma regra a manter (o teto da reserva).
- Diálogos de reserva (criar/editar) continuam no desenho antigo. Fica como próximo passo para deixar tudo no padrão novo.

## Links

- [ADR-013](013-pagina-corrida-sem-cartoes.md)
- [ADR-016](016-componentes-de-formulario-unicos.md)
- [ADR-022](022-logica-pura-testavel-e-mvvm.md)
- [ADR-024](../../../dominio-api/docs/adr/024-migrations-somente-aditivas.md)
- [ADR-028](../../../dominio-api/docs/adr/028-saude-da-conexao-e-investimentos-da-pluggy.md)
