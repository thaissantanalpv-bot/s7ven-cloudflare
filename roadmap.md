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
- [x] Validar grupos, sabores e estoque no servidor e reservar os itens escolhidos atomicamente.
- [x] Verificar cadastro, compra e regressões: cadastro administrativo, montagem por grupos, carrinho após recarregar, pedido real com preço fixo e WhatsApp correto, estoque de produto/sabor de 5 para 3; 38 testes passaram e build OK.

# Entrega ou retirada
- [ ] Implementar indicadores privados de visitas, carrinhos e desistências com atualização automática e verificar fluxo real.
- [x] Mostrar endereço de retirada e configurar taxa fixa compartilhada: 22 testes passaram; catálogo mostrou retirada sem taxa e entrega de R$ 9 totalizando R$ 54; pedido real registrado e WhatsApp conferido, pedido de teste removido.
- [x] Adicionar escolha salva no carrinho, endereço e taxa somente para entrega.
- [x] Registrar modalidade e exibir no WhatsApp e painel, mantendo validação no servidor.
- [x] Verificar cálculos, validação e finalização: 29 testes passaram; entrega sem endereço bloqueada, retirada persistida após recarregar e pedido real registrado sem endereço/taxa, com total de R$ 45 e mensagem WhatsApp correta.