# ADR-015: Home organizada de hoje para o mês, com "Para gastar hoje" como herói

- **Data**: 2026-11-05
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: ui, produto

## Contexto e problema

O topo da Home tinha três componentes bonitos que chamavam atenção ao mesmo tempo (disponível da semana, selo de ritmo e barra do mês), com cores diferentes. Uma proposta anterior aproximou a Home da tela Planejar, o que foi rejeitado: a Home deve mostrar como vão ser os próximos dias, e mais abaixo como foi até agora. Destacar as entradas não ajuda, porque a maioria das pessoas recebe poucas vezes no mês.

## Opções consideradas

- "Hoje + resumo": um número para hoje e o resto em linhas calmas
- Manter os três componentes e só reduzir as cores
- Home como resumo do plano do mês

## Decisão

Escolhida: **"Hoje + resumo"**, nesta ordem fixa:

1. **Para gastar hoje**: número grande e neutro.
2. **Até sábado**: quanto resta até o fim da semana, ou "Passou R$ X do limite", que é o único vermelho do topo.
3. **O que fazer**: uma frase de ação, por exemplo como se recuperar.
4. **Semana passada**: a vitória da semana.
5. **Esta semana**: barra neutra com um trecho vermelho só para o excesso, e a faixa de dias sem cor.
6. **Mês**: barra cinza que mostra os grupos ao tocar.

A lógica fica em `lib/home.ts`, com testes: `homeToday` decide entre os estados ok, recuperar, usado e estourado, e `weekBarSplit` divide a barra. O selo de ritmo saiu do topo, e o card "Agendado" saiu porque o sino de notificações já cumpre esse papel.

### Consequências positivas

- Um só ponto de atenção, com uma resposta direta: quanto posso gastar hoje.
- A ordem vai do agora para o passado, sem troca de cor.

### Consequências negativas

- Menos informação visível de imediato. Os grupos do mês exigem um toque.
- Entradas e saldo perderam destaque na Home.

## Links

- [ADR-003 (dominio-api)](../../../dominio-api/docs/adr/003-limite-semanal-dinamico.md), [ADR-010](010-vitorias-e-sequencia-no-azul.md), [ADR-013](013-pagina-corrida-sem-cartoes.md), [ADR-018 (dominio-api)](../../../dominio-api/docs/adr/018-sobra-da-semana-configuravel.md)
