# Meu Controle Financeiro — Dev Kayko

**Versão 2.2 · Novembro de 2026** · HTML, CSS e JavaScript · compatível com GitHub Pages.

Controle financeiro pessoal **manual**, sem servidor ou autenticação, com backups e navegação adaptável para desktop e celular. Não é instituição financeira, banco, corretora, carteira de criptomoedas ou sistema de pagamentos. Não realiza operações, Pix nem sincroniza saldos reais.

## Novidades desta versão

- **Visão geral:** saldos de aplicativos, pontos e criptomoedas, exibindo os valores originais e estimativas convertidas para reais quando há taxas disponíveis. Saldos externos e dívidas **não** são misturados com saldo disponível do mês.
- **Chaves Pix:** salvar, identificar, editar, copiar, mostrar ou ocultar chaves de *recebimento*, com banco, titular e observações. Sem acesso a bancos e sem transferência Pix.
- **Dívidas e acordos:** comparar ofertas à vista e parceladas, cadastrar entrada e número de parcelas, escolher modalidade, simular vencimentos e acompanhar total pago. O saldo de acordos confirmados **não** é baixado automaticamente dos lançamentos.
- **Orçamento:** adicionar, renomear e excluir categorias (inclusive as iniciais quando não estiverem em uso), registrar observações em cada categoria e alterar limites mensais. Ao renomear, os lançamentos de gastos, contas fixas e orçamentos vinculados acompanham a categoria.
- **Criptomoedas:** 75 ativos predefinidos, incluindo **Pi Network (PI)** e **Silencio (SLC)**; busca por nome ou sigla, filtros em saldos, favoritos, setas para mudar a ordem, arraste no computador e cadastro manual de outros criptoativos.
- **Cotações:** referências externas CoinGecko e CoinPaprika, com falhas tratadas como indisponibilidade. O acesso gratuito direto ao CoinMarketCap depende de API e não é garantido; esse serviço também aparece como link de consulta.
- **Impressão:** relatório geral com lançamentos, orçamento, categorias, dívidas, saldos, metas e investimentos. Chaves Pix **não são impressas por completo**.
- **Código:** módulos organizados por função, HTML e CSS formatados e comentários para facilitar a edição.

## Estrutura

```text
index.html                        Páginas, menus e formulários
style.css                         Design, temas e responsividade
app.js                            Cadastros, painel, dados, backup e conversão
favicon.svg                       Ícone
assets/css/contas-prioridades.css Alertas das contas fixas
assets/css/rendimentos-simulador.css
assets/css/cotacoes-fontes.css
assets/css/investimentos-trade.css
assets/css/relatorio-impressao.css
assets/js/contas-prioridades.js   Ordenação e alertas de contas
assets/js/rendimentos-simulador.js Cálculo CDI/Tesouro Selic
assets/js/cotacoes-fontes.js      CoinGecko e CoinPaprika
assets/js/investimentos-trade.js  Simulador e carteira manual
assets/js/relatorio-impressao.js  Janela de impressão
assets/js/dividas-acordos.js     Regras de ofertas e parcelas
assets/js/ferramentas.js        Calculadora e bloco de notas
assets/css/ferramentas.css      Estilos das ferramentas
README.md
.nojekyll
```

> O `index.html14off` que acompanhou os arquivos enviados é uma página de **projeto arquivado**, não faz parte deste sistema e não foi incluído. Os módulos auxiliares referenciados no HTML original não foram enviados. O pacote inclui versões funcionais reconstruídas deles; confira eventuais personalizações anteriores desses módulos antes de substituir seu site publicado.

## Publicar no GitHub Pages

1. **Antes de atualizar**, abra o site atual no navegador em que estão seus dados e use **Backup do dia** para salvar seu JSON privadamente.
2. Extraia o ZIP desta atualização.
3. Abra seu repositório do GitHub e envie **todos os arquivos e a pasta `assets/` para a raiz**, substituindo os anteriores.
4. No repositório, acesse **Settings → Pages → Deploy from a branch**, selecione a branch principal e `/(root)`.
5. Mantenha a mesma URL e o mesmo navegador para acessar os dados do armazenamento local, ou importe o backup na nova instalação.

O GitHub Pages hospeda apenas arquivos públicos do programa. **Não suba backups, dados financeiros, senhas ou chaves pessoais no repositório.**

## Dados e segurança

O aplicativo utiliza a chave `kayko-controle-financeiro-v1` do `localStorage` e continua aceitando backups com `version: 1`, inclusive aqueles que ainda não têm as telas de Pix e dívidas. Os novos dados são preservados em backups exportados nesta versão.

- Os registros ficam no perfil de navegador do dispositivo. Limpar o navegador pode apagá-los. Não existe sincronização automática nem criptografia de ponta a ponta do backup.
- **Chaves Pix são informações identificáveis.** Cadastre somente chaves de recebimento, nunca senhas, PINs, códigos de autenticação ou chaves privadas de criptomoedas. Os dados de Pix estão no backup JSON; guarde esse arquivo em um local protegido.
- Não disponibilize o site como serviço multiusuário contendo dados financeiros sensíveis sem adicionar autenticação, armazenamento seguro e separação de contas.
- A carteira de cripto e a área de investimentos são simulações/registros manuais. Preços e retornos não são garantidos; falha de serviço significa **cotação indisponível**, nunca preço inventado.
- Pontos podem ter condições, expiração e restrições de resgate não consideradas nos cálculos.
- Acesso ao CoinMarketCap sem uma credencial de API válida **não** foi implementado automaticamente. Utilize o modo Automático ou outra fonte, ou consulte o site externamente.

## Como editar rapidamente

| Deseja alterar | Arquivo | Pesquise por |
|---|---|---|
| Texto dos menus e páginas | `index.html` | `nav-links`, `view-` |
| Cores/ajuste de tela | `style.css` | `:root`, `AJUSTES DE LAYOUT` |
| Lista de criptomoedas | `app.js` | `CRYPTO_ASSETS` |
| Regras de categoria | `app.js` | `renderBudgets`, `deleteCategory` |
| Chaves Pix | `app.js` | `renderPixKeys` |
| Dívidas e acordos | `app.js` | `renderDebts` |
| Visão geral de apps | `app.js` | `renderDashboardWallets` |
| Favoritos e ordenação | `app.js` | `toggleFavoriteWallet`, `moveWallet` |
| API das cotações | `assets/js/cotacoes-fontes.js` | `priceUSD` |
| Rendimento simulado | `assets/js/rendimentos-simulador.js` | `compare` |
| Carteira de investimentos | `assets/js/investimentos-trade.js` | `renderHoldings` |
| Relatório | `assets/js/relatorio-impressao.js` | `abrir` |

**Desenvolvedor:** Dev Kayko.


## Novidades — Calculadora e bloco de notas (v2.1)

- **Calculadora:** disponível em menu próprio; soma, subtração, multiplicação, divisão, parênteses, porcentagens, números decimais, tecla apagar/limpar, digitação pelo teclado e cópia do resultado. Histórico das 10 últimas operações **somente nesta sessão**, sem alterar saldos ou lançamentos. Exemplo: `200 + 10%` = `220`; `200 × 10%` = `20`.
- **Bloco de notas:** crie até 200 notas com título e texto (12.000 caracteres cada), pesquise por palavra, fixe notas no topo, edite e exclua. **Salvamento automático no mesmo localStorage do sistema**, sem serviço externo.
- **Backup e restauração:** notas cadastradas são incluídas no JSON existente (`notes: []`). Backups antigos sem notas continuam compatíveis. Se importar outro backup, o conteúdo atual é substituído conforme aviso na tela.
- **Segurança:** não escreva senhas, tokens, palavras de recuperação, dados bancários confidenciais ou outras informações secretas; qualquer pessoa com acesso ao mesmo perfil de navegador pode ler as notas. **Nunca publique backups pessoais no GitHub público.**
- **Arquivos de manutenção:** `assets/js/ferramentas.js` contém o mecanismo da calculadora, salvamento e interface do bloco de notas; `assets/css/ferramentas.css` reúne os estilos. O `app.js` apenas integra o armazenamento e a navegação.


## Atualização 2.2 — dívidas e paleta rosa

- **Instagram do desenvolvedor:** links do menu e rodapé atualizados para https://www.instagram.com/dev_okyak/ .
- **Dívidas e acordos:** cadastro de duas ofertas independentes por credor, **à vista** (valor total) e **parcelada** (valor total, entrada opcional e 1 a 120 parcelas). A modalidade pode ficar em avaliação ou ser escolhida.
- **Simulação das parcelas:** cálculo do valor das parcelas com ajuste de centavos e calendário mensal a partir da primeira data informada, sem inventar taxas, encargos, valores de mora ou parcelas pagas.
- **Controle manual:** situação em negociação / acordo confirmado / quitado e total efetivamente pago. A entrada só entra no pago quando você registrar. O painel conta como pendentes apenas acordos confirmados.
- **Backups antigos:** registros sem modalidade permanecem na condição 'Acordo antigo'; não são perdidos. Os campos novos entram no mesmo backup JSON.
- **Rosa claro e escuro:** paleta remodelada com tons pink e textos contrastantes (seletor 'Rosa').

**Exemplo:** dívida original R$ 1.200; oferta à vista R$ 750; oferta parcelada R$ 960 (entrada R$ 160 + 4 parcelas de R$ 200). Escolha a oferta no cadastro, confirme o acordo somente quando efetivamente aceito e atualize o campo *Total pago*. Não há integração com credores nem quitação automática.


## Versão 2.3 — correção do alinhamento e zoom

- **Orçamento por categoria:** os nomes (inclusive **Lazer**), observações e botões de editar/excluir agora são empilhados de maneira previsível, mantendo um padrão único para todas as categorias.
- **Zoom do navegador:** grade responsiva pela largura disponível do painel, reorganizando cinco, três, duas ou uma coluna conforme o espaço. Corrige sobreposição de campos em zoom reduzido e ampliado.
- **Acessibilidade:** campos de teto mensal identificados por categoria, textos longos quebram linha, botões e títulos não ficam em cima de outros elementos.
- **Compatibilidade:** mantidos os dados, o formato de backup e a chave local `kayko-controle-financeiro-v1`.

Ajustes de tela e zoom estão isolados em `assets/css/zoom-responsivo.css`; a renderização das categorias permanece em `app.js` (`renderBudgets`).

Para aplicar no GitHub Pages, substitua os arquivos de mesmo nome e preserve as pastas `assets/`. Faça antes um backup JSON.


## Versão 2.4 — parcelas com valores individuais

Em **Dívidas e acordos → Adicionar/Editar**, informe o valor total da proposta parcelada, a entrada (se houver) e a quantidade de parcelas. Marque **Definir o valor de cada parcela individualmente** para digitar valores diferentes, por exemplo R$ 120,00, R$ 150,00 e R$ 180,00. O aplicativo mostra a soma e impede salvar quando a soma das parcelas mais a entrada não corresponde ao total da proposta. O calendário continua mensal; os valores individuais são preservados em backups JSON e na edição. Backups antigos permanecem compatíveis.


## Versão 2.5 — navegação e anexos no Bloco de notas

- Menu lateral com clique direto para **Chaves Pix**, **Dívidas e acordos** e todas as demais telas, sem depender da delegação de eventos do conteúdo.
- Menu rolável em alturas pequenas e zoom elevado; navegação por `#pix`, `#dividas` e os demais identificadores.
- **Bloco de notas:** anexar fotos, PDF, documentos, arquivos ZIP e áudio; abrir, baixar e excluir anexos.
- Cada anexo tem no máximo **900 KB**, cada nota aceita até **8 anexos**, e o conjunto de notas aceita aproximadamente **2 MB** em anexos (conteúdo bruto). Arquivos maiores devem ser guardados em armazenamento externo.
- Os anexos são gravados como Base64 no mesmo banco local do navegador e incluídos no **backup JSON**. Isso deixa o backup maior. Não envie esse arquivo a repositórios públicos.
- **Aviso de privacidade:** o site não usa servidor e não protege arquivos com senha. Qualquer pessoa com acesso ao mesmo perfil do navegador pode abrir as notas.


## Versão 2.6 — várias chaves Pix no mesmo cadastro

Em **Minhas chaves Pix**, clique em **Adicionar chave Pix**. Preencha a identificação, banco e titular uma vez e use **+ Adicionar outra chave** para cadastrar até 20 chaves (CPF, CNPJ, e-mail, celular ou aleatória). Cada chave é exibida individualmente e tem botões próprios de **Mostrar** e **Copiar**. Ao editar um cadastro, é possível adicionar ou remover chaves. Os backups anteriores com uma única chave são migrados automaticamente ao carregar, sem alterar a chave local de armazenamento. Ao excluir um cadastro, todas as suas chaves são excluídas. Faça backup antes de atualizar.
