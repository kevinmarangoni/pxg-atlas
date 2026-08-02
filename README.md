# PXG Atlas

Frontend React + Vite para consultar Pokémon, clãs, tiers, funções PvE/PvP,
tasks, Pokélog, itens, crafting, helds, berries, quests, NPCs, bosses e
calculadoras do PokeXGames.

O site é estático e não consulta APIs externas durante o uso ou o build. Os
domínios maiores são snapshots JSON independentes, carregados somente quando a
rota precisa deles:

- `pxg_pokemon_capture.json`: Pokédex principal e compatibilidade legada;
- `pxg_catalog.json` e `pxg_crafting.json`: ItemDex, drops, vendedores e receitas;
- `pxg_guides.json`: quests, NPCs e bosses;
- `pxg_progression.json`: EXP, Nightmare e Pokébolas;
- `pxg_world_content.json`: timers e pontos de respawn publicados.

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

## Domínios e ferramentas

Além da Pokédex, o menu **Ferramentas** oferece as rotas `/items`, `/crafting`,
`/held-items`, `/pokelog`, `/unowns`, `/quests`, `/npcs`, `/bosses`, `/berries` e
`/calculators/*`. Preços são manuais e ficam em perfis nomeados por servidor no
navegador. O backup em JSON da rota `/tools` exporta e restaura preços,
inventário, projetos e progresso sem enviar dados para um backend.

## Sincronização e validação da Wiki

O sincronizador MediaWiki usa cache por revisão, retries, concorrência limitada,
retomada e atualização por domínio. As atualizações são executadas manualmente e
os snapshots resultantes são versionados:

```bash
yarn sync:wiki                 # todos os domínios
yarn sync:wiki --domain=catalog
yarn sync:wiki --domain=guides
yarn validate:data
yarn test
```

Uma sincronização incompleta ou com referências inválidas falha a validação;
cada snapshot exibe no site a data e o estado **Completo/Parcial**.

## Mapa interativo

A rota `/#/map` reúne o mapa OTMM por andares, posições de Pokémon, orbs e
camadas de NPCs/tasks. É possível buscar um Pokémon ou local, agrupar respawns
próximos, usar links com coordenadas, marcar orbs coletadas e abrir a ficha do
Pokémon diretamente. O zoom captura a roda do mouse dentro do mapa para impedir
o scroll da página; marcadores de outros andares ficam transparentes e exibem
seta verde para cima ou vermelha para baixo.

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

Os tiles convertidos ficam em `public/data/otmm_tiles` e são a fonte visual
prioritária do mapa Johto. Não há fallback para uma imagem comprimida: quando o
OTMM não cobre uma área, o Atlas informa a ausência em vez de inventar uma
posição. O comando atualiza coordenadas, respawns, metadados de andares e o
índice de tiles.

## Build e validação de produção

```bash
yarn install --frozen-lockfile
yarn test
yarn validate:data
yarn build
yarn preview
```

Os arquivos gerados ficam em `dist/`. Antes de publicar, também é recomendado
executar `git diff --check`.

## Deploy na Vercel

1. Envie esta pasta para um repositório Git.
2. Importe o repositório na Vercel sem alterar o **Root Directory**.
3. O preset Vite, o comando `yarn build` e a pasta `dist` já estão definidos em
   `vercel.json`.
4. Publique o projeto.

O rewrite configurado em `vercel.json` entrega `index.html` para as rotas do
React Router sem erros 404 ao atualizar a página.

Os avisos de independência, atribuições, privacidade e solicitações de remoção
estão disponíveis em `/#/legal` e no rodapé da aplicação.

## Estrutura

```text
.
├── public/
│   └── data/
│       ├── pxg_*.json
│       └── otmm_tiles/
├── scripts/
│   ├── convert-otmm.mjs
│   ├── sync-pxgmap.mjs
│   ├── sync-wiki-data.mjs
│   └── validate-data.mjs
├── src/
├── tests/
├── index.html
├── package.json
├── vercel.json
├── vite.config.js
└── yarn.lock
```
