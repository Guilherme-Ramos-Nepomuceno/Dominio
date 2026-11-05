# ADR-016: FormSheet e AppSelect como componentes únicos de formulário

- **Data**: 2026-11-05
- **Status**: Aceito
- **Decisores**: Guilherme Ramos Nepomuceno
- **Tags**: ui, componentes

## Contexto e problema

Cada janela por cima de outra tela era um `Dialog` diferente, com cartão, sombra e botões próprios: editar lançamento, cartão, categoria, juntar cartões, importar extrato. Os seletores eram `<select>` nativos, cada um com uma classe. No modo escuro, a lista nativa abria clara e não aceitava estilo. Ajustar `color-scheme` e `option` melhorou o resultado, mas ele continuou feio.

## Opções consideradas

- Componentes próprios em cima do Radix (já instalado via shadcn)
- Continuar com o `<select>` nativo, só com `color-scheme`
- Biblioteca de formulário completa (ex.: react-select)

## Decisão

- **`components/ui/form-sheet.tsx`**: folha que sobe de baixo no celular e fica centralizada no computador. Tem título discreto, conteúdo com respiro, botão principal num rodapé próprio (`SheetPrimaryButton`) e campo sublinhado sem caixa (`UnderlineInput`). Fecha com Esc ou com um toque fora.
- **`components/ui/app-select.tsx`**: seletor único sobre o Radix Select, com dois formatos:
  - `field`: largura cheia e a mesma altura dos campos.
  - `pill`: do tamanho do texto, para usar dentro de uma linha.
- O AppSelect aceita opção vazia que pode ser escolhida (`emptyLabel`), já que o Radix não aceita `""`, e grupos com título (`group`). A opção escolhida aparece com ✓.
- Os 11 `<select>` nativos foram trocados. Não sobrou nenhum.

### Consequências positivas

- A lista abre no tema do app, igual em todas as telas e plataformas.
- Uma mudança visual vale para todos os formulários.

### Consequências negativas

- No iOS, perde-se o seletor em roda nativo, mais confortável para listas longas.
- Com `required`, o Radix usa um `<select>` escondido, e o aviso de campo obrigatório do navegador pode aparecer em outro lugar. Telas críticas validam também no handler.
- No `select.tsx` base, a altura padrão não pode usar o seletor `data-[size=default]`, senão ela vence a `className` de cada tela.

## Links

- [ADR-013](013-pagina-corrida-sem-cartoes.md)
