# Publicação de 15/10/2026
- [x] Publicar as correções pendentes (contagem por aparelho, entrega por endereço, combos até 100, loja fechada, esgotados, foto por variação, cards alinhados); a versão publicada mostrou 202 produtos, Destaques e Rua/Número/Bairro separados sem CEP.
- [ ] Conferir no aparelho a reabertura sem internet e o envio real de pedido; a taxa por quilômetro só se confirma com endereço real.

# Correção do cálculo de entrega por endereço
- [x] Mostrar aviso de loja fechada antes dos produtos, usando os horários cadastrados; aviso e grade real verificados em 384/1280px, seis testes passaram e build OK, sem alterar horários.
- [x] Completar endereço de saída com Araçatuba via painel autenticado; readback confirmou preservação das nove faixas reais e valores.
- [x] Preencher Araçatuba automaticamente e validar cidade/estado/país e endereço completo antes da rota; endereço normalizado também no pedido e WhatsApp.
- [x] Calcular ao sair do campo de endereço, descartar respostas antigas e exibir taxa/erros junto do endereço sem indicar entrega gratuita antes da cotação.
- [x] Executar 23 testes; carrinho de 384px mostrou cidade fixa e aviso offline sem chamadas Maps, sem erros de execução; build OK.
- [ ] Validar rota e taxa real no site autorizado após publicação desta versão; Google Maps não pode ser verificado no ambiente de teste.

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
- [ ] Confirmar reabertura sem internet na versão publicada; já publicada em 15/10/2026, falta testar no aparelho.

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
- [ ] Validar Google Maps no site publicado após cadastrar endereço completo de saída e faixas reais; chamadas de Maps não são verificáveis no ambiente de teste.
- [ ] Confirmar o aviso de loja fechada na versão publicada fora do horário (aberta durante a verificação) e o selo "Esgotado" com um produto de estoque zerado.
## Novo pedido (Thais, 15/10/2026 19:44 UTC)
- [x] Implementado (15/10/2026): migration 0019 (variationPhotos na projeção, filtrada às fotos já públicas), photoForOption/variationPhoto em catalog.ts, ProductCardPhotos com prop option, seletor "Vincular à variação" por foto no painel (remoção/edição IA remapeiam ou desligam o vínculo), grids items-stretch + cards h-full. 84 testes passando.
- [x] Bloquear pedido de produto com estoque zerado e mostrar "Esgotado" no card (botão desabilitado, selo no card, sabor esgotado sinalizado, "+" limitado ao estoque)

## Divulgação do endereço publicado (Thais, 15/10/2026 20:24 UTC)
- [x] Manter s7venlounge.lovable.app sem alterar o link e orientar a divulgação.
- [x] Gerar QR de balcão (100×150mm) e de cartão (90×50mm) em PDF vetorial e PNG 300dpi com a logo no centro; leitura conferida em tamanho cheio e reduzido a 1/4.
- [x] Escrever mensagens prontas para status, lista de transmissão, resposta automática, reposição e reativação.
