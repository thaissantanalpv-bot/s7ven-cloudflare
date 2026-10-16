# Melhorias solicitadas em 16/10/2026
- [x] Relatório de vendas hoje/semana/mês, mais vendidos, ticket médio e cancelamentos. Leitura administrativa limitada ao período; vendas reais conferidas.
- [x] Previsão de entrega: 30–45 minutos de preparo + duração da rota de moto; duração persistida nas cotações. Rua Joaquim Cândido, 2282: R$ 11,10 / 7,02 km / estimativa 47–62 min.
- [x] Alterar etapa e abrir mensagem WhatsApp em uma ação, sem envio automático; abre somente após salvar, com atalho de recuperação se janela bloqueada.
- [x] 42 testes passaram; relatório desktop/celular sem rolagem lateral, pedido fictício mudou etapa e mensagem correta após salvar/recarregar; removido por ID exclusivo. Endereço real conferido, sem erros de página; build OK.
- [ ] Publicar as três melhorias e o aviso de cancelamento por WhatsApp: aguarda pedido de publicação.

# Aviso de cancelamento ao cliente (Thais, 16/10/2026 23:09 UTC)
- [x] Sem e-mail do cliente nos pedidos; Thais escolheu WhatsApp. Mensagem de cancelamento inclui o motivo registrado; botão "Avisar o cliente no WhatsApp" aparece logo após cancelar e no registro de cancelados. 29 testes, tipos e build OK. Falta publicar.

# Alerta de estoque baixo (Thais, 16/10/2026 23:00 UTC)
- [x] Mínimo por produto e por sabor (minStock, padrão sem alerta); painel mostra "Repor" por item, filtro "Estoque baixo" e cartão na tela inicial. 119 testes, tipos e build OK.

# Cancelamento de pedidos (Thais, 16/10/2026 22:28 UTC)
- [x] Registrar motivo obrigatório e devolver estoque uma única vez. Teste real: 2 combos/6 unidades de sabor restauraram estoques exatos 10/20/15; repetições simultâneas não duplicaram e reativação foi rejeitada.
- [x] Painel e histórico conferidos após recarregar; 40 testes passaram, registros temporários removidos, catálogo HTTP 200 e build OK. Aguardando solicitação de publicação.

# Rota de moto e teste de alerta (Thais, 16/10/2026 21:35 UTC)
- [x] Google Routes suporta TWO_WHEELER no Brasil; cálculo ajustado para moto, taxas preservadas, cotações antigas invalidadas e aviso beta incluído. 12 testes passaram; validação real da rota depende do site publicado.
- [x] Publicado em s7venlounge.shop e conferido no celular (390px): sugestão "Rua Joaquim Cândido, 2282" preencheu o bairro e a taxa saiu "R$ 11,10 · 7,02 km pela rota de moto", com o aviso beta visível e sem erros de página.
- [x] Pedido fictício -2135 criado em Recebido sem itens, e-mail ou conversão; painel de celular mostrou Som ativo sem erros. O teste foi movido para Entregue durante a verificação e excluído pelo ID exclusivo, sem alterar pedidos reais.

# Endereço em uma única linha (Thais, 16/10/2026 02:22 UTC)
- [x] Deixar só uma linha para rua e número, com as sugestões embaixo, e mostrar o bairro logo abaixo sem caixa própria. Conferido no preview: campos agora são Rua e número + Cidade; sugestão real preenchida, bairro "Conjunto Residencial Toyokazu Kawata" e taxa R$ 11,10 · 7,02 km; 11 testes, sem erros de digitação, 390px sem rolagem lateral. Falta publicar.
- [x] Confirmar que só aparecem bairros de Araçatuba: sugestões filtradas por cidade e endereço conferido no cálculo da rota.

# Sugestões automáticas de endereço (Thais, 16/10/2026 02:12 UTC)
- [x] Autocompletar rua+número com sugestões do Google restritas a Araçatuba; selecionar preenche rua, número e bairro. Verificado no preview com endereço real (Rua Joaquim Cândido, 2282 → bairro preenchido); 10 testes e build OK. Falta publicar.

# Otimização do banco e consumo
- [x] Medir créditos, consultas, índices e armazenamento: 03–16/10, 227,36 créditos solicitados; 221,90 criação, 5,46 funcionamento; banco pico 14,25 h / 1,10 crédito, 13,2 MB, saudável. Nenhum agendamento HTTP retornado; cron interno não inspecionável.
- [x] Corrigir varreduras repetidas na autorização de fotos: migration 0021 adiciona índices das expressões de capa/galeria, sem alterar políticas, dados ou frequência de atualização.
- [x] Comparar o mesmo trabalho: 199 capas, execução 16,336 → 4,545 ms, plano usa ambos os índices; 56 KiB adicionais; 13 testes passaram, catálogo e administração autenticada conferidos, build OK.
- [ ] Reduzir consultas automáticas de 5 segundos: depende de autorização para mudar a frequência dos avisos/indicadores; economia de créditos depende de medir horas ativas após a mudança.

# Falha intermitente no cálculo de entrega
- [x] Corrigir restauração da rua no carrinho salvo e impedir cálculo sem rua/número.
- [x] Verificar endereço Joaquim Candido, 2282 restaurado no navegador, bloqueio sem número e 22 testes; build OK, sem chamadas Maps.
- [x] Confirmar cálculo real no site publicado: carrinho de teste com Rua Joaquim Cândido, 2282 calculou a rota e a taxa sem erros de execução.

# Impressão térmica de pedidos
- [x] Adicionar ícone de impressão nos pedidos e configuração local de nome/papel 58 ou 80 mm.
- [x] Verificar via do entregador com endereço, itens, pagamento e totais em pedido real do painel, sem alterar pedidos; pedido #7 conferido em 58 mm no celular e impressão nativa acionada.
- [x] Conectar e testar a impressora física: B&G BG-01 (térmica 58 mm, Bluetooth) ligada ao aparelho da loja e conferida por Thais em 16/10/2026 22:08 UTC.

# Publicação de 15/10/2026
- [x] Publicar as correções pendentes (contagem por aparelho, entrega por endereço, combos até 100, loja fechada, esgotados, foto por variação, cards alinhados); a versão publicada mostrou 202 produtos, Destaques e Rua/Número/Bairro separados sem CEP.
- [ ] Conferir no aparelho a reabertura sem internet e o envio real de pedido; a taxa por quilômetro só se confirma com endereço real.

# Correção do cálculo de entrega por endereço
- [x] Mostrar aviso de loja fechada antes dos produtos, usando os horários cadastrados; aviso e grade real verificados em 384/1280px, seis testes passaram e build OK, sem alterar horários.
- [x] Completar endereço de saída com Araçatuba via painel autenticado; readback confirmou preservação das nove faixas reais e valores.
- [x] Preencher Araçatuba automaticamente e validar cidade/estado/país e endereço completo antes da rota; endereço normalizado também no pedido e WhatsApp.
- [x] Calcular ao sair do campo de endereço, descartar respostas antigas e exibir taxa/erros junto do endereço sem indicar entrega gratuita antes da cotação.
- [x] Executar 23 testes; carrinho de 384px mostrou cidade fixa e aviso offline sem chamadas Maps, sem erros de execução; build OK.
- [x] Validar rota e taxa real no site publicado: taxa calculada pela rota exibida no carrinho com endereço real de Araçatuba, sem erros de execução.

# Melhorias de venda solicitadas em 15/10/2026
- [x] Organizar mensagem WhatsApp com nomes, quantidades, valores e links permanentes para visualizar fotos dos produtos; verificação automatizada do destino e mensagem.
- [x] Exibir destaques no início e permitir seleção pela administração; Energético Bally 2 Litros e Gelo de Sabor selecionados inicialmente e conferidos na vitrine.
- [x] Mostrar aviso de carrinhos abandonados no início e indicadores do painel, sem identificar visitantes anônimos; painel autenticado mostrou 8 carrinhos sem pedido.
- [x] Verificar salvamento administrativo, duas unidades adicionadas, galeria compartilhada com foto carregada e layouts 384/1280px sem cortes; 25 testes passaram e build OK.
- [ ] Confirmar envio real de pedido com a nova mensagem: loja fechada durante a verificação; horários reais preservados.

# Correção das 22 listas cortadas
- [x] Conferir novamente as opções legíveis no PDF e limpar 22 descrições, removendo trechos incompletos sem alterar preços, fotos, estoques ou opções completas. Kit De Mangueira Com Piteira ficou com descrição/opções vazias por apresentar somente uma opção cortada.
- [x] Conferir readback dos 22 registros e preservação dos demais produtos; catálogo com seleção de sabor e editor administrativo autenticado mostraram listas limpas, sem erros de execução.

# Atualização completa do catálogo de 15/10/2026
- [x] Conferir PDF: preços e fotos presentes; listas de sabores/cores truncadas e quantidades de estoque ausentes.
- [x] Atualizar 198 produtos/capas do PDF, incluindo 4 novos; preços existentes já coincidem. Estoques nulos e somente opções completas legíveis; identidades, galerias adicionais e combos preservados.
- [x] Gerar lista CSV/Markdown de 198 estoques ausentes, 22 listas cortadas e 158 descrições ausentes; readback dos 198 registros, catálogo/painel autenticado com foto nova e 7 testes passaram, sem erros de execução.

# Catálogo branco inspirado na referência
- [x] Aplicar fundo branco e abas pretas apenas no catálogo, preservando o painel.
- [x] Mostrar dois produtos por linha no celular e ícone existente S7VEN no início.
- [x] Verificar fotos, opções e carrinho em celular e computador: 384px e 1280px sem rolagem horizontal, carrinho somou R$ 35 + R$ 9; 18 testes passaram e build OK.

# Catálogo offline
- [x] Preparar abertura offline somente do catálogo público, sem cache de dados administrativos.
- [x] Salvar produtos/configurações públicas e atualizar ao reconectar; manter pedidos online.
- [x] Verificar consulta offline e reconexão no navegador com 195 produtos e 32 testes; registro corretamente desativado no preview.
- [x] Confirmar reabertura sem internet na versão publicada: em 16/10/2026 o service worker não ativava (424 arquivos no precache, ~30 s de instalação); reduzido o precache aos arquivos de entrada com CacheFirst em /assets/ (vite.config.ts). Teste simulado no site publicado: worker controla em ~2 s e o catálogo reabre offline com o aviso "Sem conexão".

# Fase 1
- [x] Reformular o catálogo premium com referência visual TabaDega, preservando produtos, sabores, Pix e WhatsApp.
- [x] Criar painel protegido para taxas por região e horários semanais, com salvamento compartilhado.
- [x] Integrar entrega ao total/Pix/WhatsApp e mostrar horários no catálogo.
- [x] Verificar fluxo de compra, persistência do carrinho e proteção do painel.
- Verificação anterior fora desta etapa: salvamento das taxas e horários com conta administrativa sem alterar configurações reais.
- [x] Concluir acesso administrativo para thais.santana.lpv@gmail.com: conta autorizada acessou o painel na verificação do PDV.

# Fase 2
- [x] Validar WhatsApp no carrinho com máscara brasileira e erros claros.
- [x] Registrar pedidos do catálogo com telefone do cliente e valores verificados.
- [x] Criar quadro Kanban administrativo com as quatro etapas e mensagens WhatsApp.
- [x] Adicionar alerta sonoro ativável e atualização automática dos pedidos.
- [x] Verificar envio real no catálogo, leitura do registro, privacidade e 18 testes de etapas, som e telefone.
- Verificação anterior fora desta etapa: mover pedidos reais entre etapas; testes automatizados passaram.

# Produtos e estoque
- [x] Criar cadastro compartilhado preservando os 176 produtos e carrinhos existentes.
- [x] Adicionar edição de preços, fotos, descrições, categorias e variações ao painel.
- [x] Gerenciar quantidades e pausa de produtos/variações, refletindo no catálogo e pedidos.
- [x] Verificar validação, catálogo, carrinho salvo, proteção do painel e testes.
- [x] Verificar criação/edição e baixa de estoque de ponta a ponta com conta administrativa na venda de balcão.
- Verificação anterior fora desta etapa: envio de foto real com conta administrativa; teste automatizado passou.

# Frente de caixa
- [x] Criar vendas presenciais protegidas com pagamento, troco e baixa atômica de estoque.
- [x] Adicionar seleção rápida de produtos e variações, recibo e histórico unificado ao painel.
- [x] Testar cálculo, validação, regressões e acesso ao caixa: 34 testes; venda administrativa registrada, lida no histórico e estoques do produto/variação reduzidos. Dados de teste removidos.

# Fotos dos produtos
- [x] Ampliar fotos no catálogo com galeria navegável.
- [x] Permitir adicionar várias fotos, escolher capa e remover fotos no painel.
- [x] Verificar galeria, salvamento e regressões: envio de duas fotos com conta administrativa, capa alterada, fotos lidas no painel e catálogo; testes passaram e produto temporário removido.

# Vitrine atualizada
- [x] Exibir informações de venda atualizadas sem liberar acesso aos cadastros completos ou edição.
- [x] Validar catálogo público, fotos, carrinho e acesso administrativo: projeção pública real, fotos vinculadas acessíveis, envios soltos bloqueados, painel autorizado e carrinho preservado; 16 testes passaram.

# Validação da finalização
- [x] Validar produtos e quantidades totais por sabor e produto, inclusive itens de carrinhos salvos.
- [x] Mostrar erros de endereço e pagamento antes de enviar e atualizar o WhatsApp de finalização.
- [x] Verificar testes e fluxo do carrinho no catálogo: campos obrigatórios e produto ausente bloquearam envio; pedido real exibiu recibo e novo destino WhatsApp; pedido temporário removido; 23 testes passaram e build OK.

# Combos
- [x] Criar aba de cadastro com preço fixo, grupos, quantidades e produtos permitidos.
- [x] Permitir montagem no catálogo e preservar escolhas no carrinho e no pedido.
- [x] Ampliar a quantidade de cada grupo do combo de 10 para 100 unidades e permitir digitar a quantidade na montagem.
- [x] Validar grupos, sabores e estoque no servidor e reservar os itens escolhidos atomicamente.
- [x] Verificar cadastro, compra e regressões: cadastro administrativo, montagem por grupos, carrinho após recarregar, pedido real com preço fixo e WhatsApp correto, estoque de produto/sabor de 5 para 3; 38 testes passaram e build OK.

# Entrega ou retirada
- [x] Verificar finalização completa e conversão: pedidos reais de teste registrados com R$ 54, WhatsApp correto e contagem automática; corrigidos conversão sem visita prévia, bloqueio por telemetria e Pix/total após envio. Horários originais preservados; pedidos temporários removidos.
- [x] Implementar indicadores privados de visitas, carrinhos e desistências: painel autenticado recebeu visita e carrinho automaticamente; inatividade de teste mostrou desistência; 21 testes passaram e build OK. Finalização de pedido nesta verificação bloqueada pelo horário real da loja; horários preservados e visitas artificiais removidas.
- [x] Mostrar endereço de retirada e configurar taxa fixa compartilhada: 22 testes passaram; catálogo mostrou retirada sem taxa e entrega de R$ 9 totalizando R$ 54; pedido real registrado e WhatsApp conferido, pedido de teste removido.
- [x] Adicionar escolha salva no carrinho, endereço e taxa somente para entrega.
- [x] Registrar modalidade e exibir no WhatsApp e painel, mantendo validação no servidor.
- [x] Verificar cálculos, validação e finalização: 29 testes passaram; entrega sem endereço bloqueada, retirada persistida após recarregar e pedido real registrado sem endereço/taxa, com total de R$ 45 e mensagem WhatsApp correta.

# Aplicativo da administração
- [x] Preparar ícones e acesso à tela inicial, abrindo diretamente o painel protegido.
- [x] Facilitar navegação pelo celular com início, pedidos, caixa, produtos e menu, preservando a operação atual.
- [x] Verificar acesso autenticado, navegação e metadados do aplicativo, sem adicionar funcionamento offline: painel autorizado, redirecionamento sem sessão, ícones, todas as abas e instruções no celular; 10 testes passaram, sem erros de execução ou rolagem horizontal. Instalação física depende da atualização publicada e confirmação no aparelho.

# Assistente da loja
- [x] Criar conversa privada única por conta e leitura agregada dos indicadores, sem dados pessoais de clientes.
- [x] Adicionar perguntas em texto, respostas em tempo real e sugestões fundamentadas nos dados pelo AI Gateway.
- [x] Verificar pergunta real, continuação, histórico após recarregar e acesso protegido: respostas reais, cálculos, parada antes da resposta, histórico restaurado, 401 sem sessão, sem rolagem horizontal no celular; 9 testes passaram e build OK. Corrigido ID ausente da resposta salva. Lint dos novos módulos passou; lint global tem falhas de formatação preexistentes. Permissão de conta não administrativa verificada no código, sem criar conta adicional de teste.

# Atualização do PDF de 13/10/2026
- [x] Conferir produtos novos, fotos e opções disponíveis no PDF.
- [x] Importar preservando identidades, estoque e configurações de combos existentes.
- [x] Verificar catálogo, galerias e opções após atualização: readback e testes de catálogo/galerias concluídos.
- [x] Exibir fotos inteiras e permitir navegar pelas fotos extras diretamente na vitrine.

# Entrega por quilometragem e fotos com IA
- [x] Configurar faixas de distância com valores editáveis e cálculo pelo endereço.
- [x] Integrar taxa calculada ao carrinho e à validação do pedido.
- [x] Adicionar edição de fotos com IA, comparação e aplicação mediante confirmação.
- [x] Verificar telas administrativas no celular, edição real com IA e 26 testes; build OK. Taxa real preservada, nenhum produto alterado durante a verificação.
- [x] Validar Google Maps no site publicado: rota e taxa reais confirmadas em 16/10/2026 com endereço de teste, faixas cadastradas preservadas.
- [ ] Confirmar o aviso de loja fechada na versão publicada fora do horário (aberta durante a verificação) e o selo "Esgotado" com um produto de estoque zerado.
## Novo pedido (Thais, 15/10/2026 19:44 UTC)
- [x] Implementado (15/10/2026): migration 0019 (variationPhotos na projeção, filtrada às fotos já públicas), photoForOption/variationPhoto em catalog.ts, ProductCardPhotos com prop option, seletor "Vincular à variação" por foto no painel (remoção/edição IA remapeiam ou desligam o vínculo), grids items-stretch + cards h-full. 84 testes passando.
- [x] Bloquear pedido de produto com estoque zerado e mostrar "Esgotado" no card (botão desabilitado, selo no card, sabor esgotado sinalizado, "+" limitado ao estoque)

## Divulgação do endereço publicado (Thais, 15/10/2026 20:24 UTC)
- [x] Manter s7venlounge.lovable.app sem alterar o link e orientar a divulgação.
- [x] Gerar QR de balcão (100×150mm) e de cartão (90×50mm) em PDF vetorial e PNG 300dpi com a logo no centro; leitura conferida em tamanho cheio e reduzido a 1/4.
- [x] Escrever mensagens prontas para status, lista de transmissão, resposta automática, reposição e reativação.

## Rastreio do entregador (Thais, 15/10/2026 20:44 UTC)
- [x] Campo de link de rastreio por pedido no painel (somente entregas do catálogo)
- [x] Botão "Acompanhar entrega em tempo real" no comprovante do cliente, atualizado sozinho
- [x] Link incluído na mensagem de WhatsApp "Saiu para entrega"
- [x] Confirmado no painel com pedido real: link salva, persiste e remove; consulta pública expõe só etapa e link

## Entrega (Thais, 15/10/2026 23:08 UTC)
- [x] Corrigir "Reabra o carrinho para calcular a entrega" (código assinado em vez de cookie bloqueado)
- [x] Preencher o bairro sozinho a partir da rua e número (pedido 16/10 00:03 UTC)

## Publicação de 16/10/2026
- [x] Publicar combos até 200, impressão com endereço, rastreio do entregador e as correções de entrega (aviso de reabrir o carrinho e bairro automático).
- [x] Conferir no site publicado: bairro preenchido sozinho (Conjunto Residencial Toyokazu Kawata) e taxa pela rota de R$ 11,10 · 7,02 km em Rua Joaquim Cândido, 2282, sem erros de execução.
- [ ] Pendências que seguem abertas: conectar a impressora física (depende do modelo e do aparelho), conferir no aparelho a reabertura sem internet e o envio real de pedido.

## Aviso de novo pedido para dois e-mails (Thais, 16/10/2026 01:43 UTC)
- [x] Enviar o aviso para thais.santana.lpv@gmail.com e 7tabacariaelounge@gmail.com, cada um recebendo um e-mail próprio sem ver o endereço do outro.
- [x] Verificar 16 testes (dois envios, chaves de repetição separadas, falha de um destinatário não bloqueia o outro) e domínio de envio verificado.
- [x] Publicar o aviso nos dois e-mails.
- [ ] Confirmar a chegada do primeiro aviso real nos dois e-mails (o envio de teste pode ser disparado em Mais → E-mails).

## Publicação de 16/10/2026 (02:00 UTC)
- [x] Publicar ícone dourado do aplicativo, favicon dourado, melhorias de busca (Araçatuba no título e nome da página, prévia ao compartilhar, produtos legíveis pelo Google, mapa do site) e o aviso de novo pedido para os dois e-mails.
- [x] Conferir no site publicado (s7venlounge.shop): página, favicon, ícones do aplicativo e mapa do site respondendo; os ícones conferidos um a um estão no 7 dourado.
- [ ] Confirmar a chegada do primeiro aviso real nos dois e-mails.
- [ ] Pendências que seguem abertas: conectar a impressora física (depende do modelo e do aparelho) e conferir no aparelho a reabertura sem internet.
- [x] Publicar o endereço em uma única linha com sugestões (16/10/2026); verificado em https://s7venlounge.shop: sugestão de "Joaquim Cândido 2282" preencheu bairro (Conjunto Residencial Toyokazu Kawata) e taxa R$ 11,10 · 7,02 km.
- [ ] No celular da Thais: apagar o atalho atual da tela inicial e criar de novo ("Adicionar à tela inicial") para o ícone dourado aparecer.

# Pausar e excluir produtos (Thais, 16/10/2026 03:13 UTC)
- [x] Adicionar exclusão definitiva de produto no painel, com confirmação; manter pausa para ocultar sem apagar. Migração 0022 libera exclusão só para administração; produtos da lista original importada não podem ser excluídos; produto em combo precisa sair do combo antes.
- [x] Publicar a opção de pausar e excluir produtos: painel publicado (s7venlounge.shop) mostrou 196 botões Excluir e 169 Pausar (27 já pausados); confirmação "Excluir Combo Gin Viagem?" aberta e cancelada sem alterar nada; testes e compilação já haviam passado na etapa anterior.

## Bloqueio de pedidos após 23:00 (Thais, 16/10/2026 04:38 UTC)
- [x] Campo "Pedidos pelo site até" nas configurações da loja (padrão 23:00), coluna order_cutoff em store_settings (migração).
- [x] Pedidos bloqueados após o limite com aviso no catálogo; catálogo segue aberto para consulta. Verificação também no servidor (orders.functions.ts).
- [x] 5 testes em src/test/order-cutoff.test.ts passando.
- [x] Publicado em https://s7venlounge.shop.
- [ ] Pendências que seguem abertas: conectar a impressora física (depende do modelo e do aparelho), conferir no aparelho a reabertura sem internet, confirmar a chegada do primeiro aviso real nos dois e-mails e recriar o atalho da tela inicial no celular para o ícone dourado.

# Alerta contínuo de pedido + link do site (Thais, 16/10/2026 18:39 UTC)
- [x] Som em loop a cada 3s enquanto houver pedido "recebido" (para ao aceitar); requer "Ativar som"
- [x] Cartão "Link do seu catálogo" no painel (Início) com copiar, WhatsApp e Instagram
- [x] Publicado em https://s7venlounge.shop.

# Som do alerta: automático, mais alto e no celular (Thais, 16/10/2026 21:33 UTC)
- [x] Som ligado sozinho ao abrir a aba Pedidos e desligado ao fechar a página.
- [x] Toque em volume máximo do aparelho e em loop contínuo enquanto houver pedido em "Recebido", parando ao aceitar.
- [x] Motor trocado de osciladores para arquivo de áudio (public/sounds/new-order-alert.mp3), que funciona no celular; 10 testes passaram e build OK.
- [x] Publicado em https://s7venlounge.shop.
- [ ] Confirmar no celular da Thais: abrir s7venlounge.shop/painel na aba Pedidos, tocar na tela uma vez e ver o alerta tocar em loop com um pedido novo real.
- [ ] Pendências que seguem abertas: conferir no aparelho a reabertura sem internet, confirmar a chegada do primeiro aviso real nos dois e-mails e recriar o atalho da tela inicial no celular para o ícone dourado.
