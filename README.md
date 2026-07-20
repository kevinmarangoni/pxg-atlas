# PXG Companion

Frontend React + Vite para consultar Pokémon, clãs, tiers, funções PvE/PvP,
tasks, Pokélog e informações de captura do PokeXGames.

O repositório contém somente o necessário para executar e publicar o site. A
base consolidada usada pela aplicação está em
`public/data/pxg_pokemon_capture.json`.

## Desenvolvimento local

Requisitos: Node.js 20.19 ou mais recente e Yarn 1.x.

```bash
yarn install --frozen-lockfile
yarn dev
```

A aplicação ficará disponível em `http://localhost:5173`.

## Build de produção

```bash
yarn install --frozen-lockfile
yarn build
yarn preview
```

Os arquivos gerados ficam em `dist/`.

## Deploy na Vercel

1. Envie esta pasta para um repositório Git.
2. Importe o repositório na Vercel sem alterar o **Root Directory**.
3. O preset Vite, o comando `yarn build` e a pasta `dist` já estão definidos em
   `vercel.json`.
4. Publique o projeto.

O rewrite configurado em `vercel.json` entrega `index.html` para rotas como
`/pokemon/:id`, `/tasks` e `/team-builder`, permitindo que o React Router cuide
da navegação sem erros 404 ao atualizar a página.

## Estrutura

```text
.
├── public/
│   └── data/
│       └── pxg_pokemon_capture.json
├── src/
├── index.html
├── package.json
├── vercel.json
├── vite.config.js
└── yarn.lock
```
