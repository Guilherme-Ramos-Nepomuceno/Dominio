# Todos os menus

Lista de todas as telas, aberta pelo item "Todos" do menu inferior. No celular, é o caminho para o que não cabe nos quatro itens do menu.

## Como está montada

- `useAllMenusViewModel` (`hooks/use-all-menus-view-model.ts`) monta `menuGroups`: quatro grupos na ordem de uso (Planejar, Registrar, Dinheiro e Ajustes). Cada item tem `href`, `icon`, `label` e `description`.
- O hook também devolve `inboxCount`, e a view mostra o contador ao lado de "A classificar".
- `AllMenusView` (`components/all-menus-view.tsx`) desenha os grupos com `Link` do Next.
- A Home fica fora, porque já está no menu inferior.

## Adicionar uma tela

1. Escolha o grupo em `menuGroups`.
2. Adicione `{ href, icon, label, description }`, com um ícone do `@phosphor-icons/react`.
3. Se a tela também deve aparecer no menu do computador, inclua em `components/layout/desktop-nav.tsx`.
