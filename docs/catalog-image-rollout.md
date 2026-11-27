# Catálogo: preparação segura dos derivados

Este procedimento existe para homologação e rollout futuro. Ele não deve ser executado contra o
Supabase de produção sem autorização explícita e uma janela de rollback.

## Propriedades de segurança

- `catalogImageId` endereça cada conjunto pelo SHA-256 do conteúdo, tipo e versão do pipeline.
- `uploadCatalogImage` usa `upsert: false`, aceita conflito de objeto já existente e envia o
  original por último. O path `_original_...` funciona como marcador de conjunto completo.
- Os paths antigos continuam válidos. O resolvedor só procura derivados quando encontra o marcador
  novo, então imagens ainda não processadas usam o original.
- O banco persiste apenas paths; URLs assinadas continuam sendo valores transitórios.

## Homologação e backfill

1. Exportar, com uma sessão administrativa autorizada, os paths distintos de capa, galeria,
   variações e banner. Manter esse arquivo como inventário e mapa de rollback.
2. Em dry-run, baixar cada original uma única vez, calcular o ID e registrar os quatro paths
   esperados sem gravar Storage ou banco.
3. Para cada original, chamar o mesmo `uploadCatalogImage` usado pelos novos uploads. Uma repetição
   retoma o conjunto sem sobrescrever objetos; falhas antes do marcador não tornam o conjunto
   elegível para leitura.
4. Verificar a existência e o MIME dos derivados 128, 512 e 1600 antes de produzir um mapa
   `path antigo -> path original novo`.
5. Somente após homologação visual e autorização separada, atualizar referências em lotes pequenos,
   preservando relações de variação. Não excluir os objetos antigos.
6. Comparar contagem de requisições e bytes com cache vazio e aquecido. Validar uma e duas abas,
   aba oculta/reativada, galeria, variações e painel.

## Rollback

Reaplicar o mapa inverso no catálogo e banner. Como os originais antigos não são sobrescritos nem
excluídos, a reversão não depende dos derivados novos. A limpeza de objetos órfãos deve ser uma
tarefa posterior, separada e explicitamente autorizada.

## Cache e verificação do build (HF-01)

O build do Cloudflare gera `dist/client/sw.js` após compilar os assets do cliente.
Em um build novo, execute `npm run build` e depois
`npx playwright test --config playwright.sw.config.ts` para verificar a rota do worker,
a atualização sobre uma instalação anterior e o cache no Chromium.

O worker armazena apenas assets públicos. O HTML do catálogo, que contém links assinados,
e as respostas de mídia privada ficam fora do Cache Storage. A atualização remove os
caches antigos de HTML e fotos. Os dados públicos do catálogo ainda têm snapshot offline
para uma aba aberta. Uma nova navegação e o carregamento de fotos privadas exigem conexão.
