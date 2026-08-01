# PXG Companion

Frontend React + Vite para consultar Pokémon, clãs, tiers, funções PvE/PvP,
tasks, Pokélog e informações de captura do PokeXGames.

O repositório contém somente o necessário para executar e publicar o site. A
base consolidada usada pela aplicação está em
`public/data/pxg_pokemon_capture.json`.

A base também relaciona os modelos 3D animados do
[Project Pokémon](https://projectpokemon.org/home/docs/spriteindex_148/) por
geração. Os GIFs são servidos pela fonte original e a imagem da Wiki permanece
como fallback para formas exclusivas do PXG ou indisponíveis no catálogo.

## Desenvolvimento local

Requisitos: Node.js 20.19 ou mais recente e Yarn 1.x.

```bash
yarn install --frozen-lockfile
yarn dev
```

A aplicação ficará disponível em `http://localhost:5173`.

## Mapa interativo

A rota `/#/map` reúne o mapa por andares, posições de Pokémon e orbs. É
possível buscar um Pokémon, alternar camadas, navegar para regiões conhecidas,
usar links com coordenadas e marcar orbs já coletadas no navegador.

Os dados públicos do PXGMap e os mapas estruturados autorizados do PXGMap Brasil
ficam consolidados em `public/data/pxg_map.json`. Para atualizar essa base:

```bash
yarn sync:pxgmap
```

Para usar a minimap original do cliente, converta o arquivo OTMM antes de
sincronizar os dados:

```bash
yarn convert:otmm /caminho/para/minimap.otmm
yarn sync:pxgmap
```

Os tiles convertidos ficam em `public/data/otmm_tiles` e são usados quando
estão disponíveis; pontos sem cobertura continuam usando a fonte remota como
fallback.

O comando atualiza coordenadas, respawns de Kanto e Johto, metadados de andares
e o índice de tiles. Os sprites continuam sendo carregados das fontes originais
durante o uso da aplicação; os tiles locais têm prioridade no mapa.

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
`/pokemon/:id`, `/tasks`, `/map` e `/team-builder`, permitindo que o React Router cuide
da navegação sem erros 404 ao atualizar a página.

Os avisos de independência, atribuições, privacidade básica e solicitações de
remoção estão disponíveis na rota `/#/legal` e pelo rodapé da aplicação.

## Estrutura

```text
.
├── public/
│   └── data/
│       ├── pxg_map.json
│       ├── otmm_tiles/
│       └── pxg_pokemon_capture.json
├── scripts/
│   ├── convert-otmm.mjs
│   └── sync-pxgmap.mjs
├── src/
├── index.html
├── package.json
├── vercel.json
├── vite.config.js
└── yarn.lock
```
