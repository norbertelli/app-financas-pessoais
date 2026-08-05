# App de Finanças Pessoais — Especificação Refinada

## 1. Visão geral

Aplicação web multi-usuário para controle financeiro pessoal em BRL (com suporte multimoeda). Permite consolidar contas bancárias, cartões de crédito e investimentos via **integração real com Open Finance Brasil**, com fallback de importação manual (colar texto de extratos, OFX, CSV, PDF). Categorização automática das transações por **IA/ML** com categorias pré-definidas e customizáveis.

## 2. Stack

- **Frontend/Backend (app principal):** Next.js (App Router, TypeScript, Tailwind) — mesmo padrão do `prompt_site_vendas`; dashboard, CRUD, auth, telas
- **Microsserviço (IA/parsing):** Python (FastAPI) — parser de extratos+PDF e categorização; expõe `POST /parse` e `POST /categorize` via HTTP
- **Banco:** MySQL 8 (Docker) com Prisma ORM
- **Auth:** NextAuth (Next.js v5, multi-usuário)
- **IA/ML de categorização:** híbrida no microsserviço — modelo local (fasttext/embedding de similaridade) + Azure OpenAI como refinador quando a confiança é baixa; usuário confirma e o modelo aprende
- **Open Finance:** acesso via **agregador participante** (ex.: Treaty/Belvo/Finansystec) atrás de interface `OFSyncProvider` (getAccounts/getTransactions/getInvestments), com Mock para dev e sandbox oficial; certificado digital + mTLS
- **Taxa de câmbio:** API SGS do Banco Central com cache e fallback manual
- **PDF:** parser server-side (docparse) no microsserviço Python com timeout e fila; OCR (Azure Vision) só se necessário para scanner
- **Pagamentos (se houver plano):** PayPal/Stripe

## 3. Modelagem de dados

### Usuários e categorias
- `User` (id, nome, email, senha/NextAuth)
- `Category` (id, userId nullable para padrão, nome, tipo: receita/despesa/transferência, icone, cor, isSystem)
  - Categorias **pré-definidas** são `isSystem=true` e `userId=null`; o usuário pode criar as próprias (`isSystem=false`)

### Contas
- `Account` (id, userId, bancoId, tipo, numero, nome, agencia, saldoInicial, moeda, ordem)
- `Bank` (id, codigo, nome, logo) — cadastro de instituições (compensação/nome)

### Extrato de conta
- `Statement` (id, accountId, periodo, saldoInicial, saldoFinal, fonte: manual/ofx/csv/pdf/open_finance)
- `Transaction` (id, statementId, accountId, data, valor, descricao, tipo, categoriaId, status: pendente/confirmada, rawText, externalId)

### Cartão de crédito
- `CreditCard` (id, userId, bancoId, nome, finalCartao, diaVencimento, melhorDiaCompra, limite, fechamento)
- `CreditCardStatement` (id, cardId, competencia, valorTotal, saldoAnterior, faturaPaga)
- `CreditCardTransaction` (id, statementId, cardId, dataCompra, valor, descricao, categoriaId, parcelas, parcelaAtual, estaDivida)
  - **Regra:** enquanto houver dívida/parcelas, gerar lançamentos de fatura **meses à frente** até zerar

### Investimentos
- `Investment` (id, userId, instituicao, tipo, saldoInicial, moeda)
- `InvestmentTransaction` (id, investmentId, data, tipo: aporte/resgate/rendimento/taxa, valor, quantidade, precoUnitario, externalId)

### Dados de Open Finance
- `OFConsent` (id, userId, status, consentId, scopes, validade, createdAt)
- `OFConnection` (id, userId, accountId, institutionId, status, ultimaSincronizacao)

### Categorização IA
- `CategorizationRule` (opcional) — regras aprendidas (padrão texto → categoria)

## 4. Módulos funcionais

1. **Dashboard**
   - Saldo final = saldoInicial + somatório das transações do extrato (conferível por extrato)
   - Cards clicáveis por conta/cartão/investimento abrindo o extrato para conferência
   - Gráfico de evolução do patrimônio, despesas por categoria
2. **Importação em lote (leitor inteligente)**
   - Entrada: colar texto, OFX, CSV, PDF — envio ao microsserviço Python (`POST /parse`)
   - Parser de **datas** (dd/mm/aaaa, dd/mm/aa, formatos OFX), **valores** (R$ 1.234,56; 1.234,56; -1.234,56), **descrições**
   - Preview com edição antes de confirmar; detecção de duplicados
3. **Categorização por IA/ML**
   - Microsserviço Python (`POST /categorize`): modelo local infere categoria por descrição + valor + padrão histórico; se a confiança for baixa, Azure OpenAI refina; usuário confirma/corrige e o modelo aprende
4. **Open Finance**
   - Fluxo de consentimento OAuth2 FAPI, validação de certificado mTLS, autorização do usuário via banco
   - Sincronização periódica de contas/transações/investimentos
5. **Cartão de crédito**
   - Sugestão de **melhor dia de compra** = `diaFechamento + 1` (compra após o fechamento maximiza o prazo até o vencimento, até ~55 dias); exibido por mês no card
   - Simulação de fatura e projeção de parcelas à frente
6. **Investimentos**
   - Movimentações (aporte, resgate, rendimento) com saldo final conferível

## 5. Regras de negócio

- Saldo final do extrato = saldoInicial + Σ transações; divergência vira alerta de conferência
- Transações importadas entram como **pendentes**; só contam no saldo após confirmação
- Dedup por (conta, data, valor, descricao, externalId)
- Cartão: ao importar compra parcelada, criar lançamentos futuros de fatura; fatura mensal = saldo anterior + compras - pagamentos
- Multimoeda: transações mantêm moeda original; exibição convertida pela taxa do BACEN (SGS), cache diário, fallback manual. Nunca grava valores convertidos — grava apenas moeda + valor original
- Categorização (microsserviço Python): modelo local categoriza por similaridade ao histórico; se a confiança for baixa, Azure OpenAI refina; confirmação do usuário vira feedback para treino/aprendizado

## 6. Fases de desenvolvimento

1. **Fase 1 — MVP manual:** auth, bancos/contas, importação texto/OFX/CSV, categorias, dashboard com saldos
2. **Fase 2 — IA:** categorização automática com aprendizado
3. **Fase 3 — Cartões:** faturas, parcelas, melhor dia de compra
4. **Fase 4 — Investimentos:** movimentações e saldos
5. **Fase 5 — Open Finance:** infraestrutura de certificado, consentimento e sincronização real
6. **Fase 6 — PDF e multimoeda**

## 7. Riscos e decisões resolvidas

### 7.1 Credenciamento Open Finance
Integração real exige ser participante da estrutura (registro BACEN, contrato de conta, certificado, testes de homologação) — caro e demorado. **Decisão:** desenvolver contra o **sandbox oficial + um agregador participante** atrás da interface `OFProvider`. As Fases 1–4 usam o mock; a troca para o agregador real é transparente e não bloqueia o restante do app.

### 7.2 Modelo de IA de categorização
**Decisão (híbrida, no microsserviço Python):** regras/embedding **local** (ex.: fasttext) para categorização inicial — rápido, offline, sem custo por token — e **Azure OpenAI como refinador** quando a confiança do local é baixa. Feedback do usuário alimenta o histórico. Mantém os dados sensíveis predominantemente na nuvem própria (Foundry), já disponível no ambiente.

### 7.3 Fonte da taxa de câmbio
**Decisão:** **SGS do BACEN** — API oficial e gratuita, taxas diárias, com cache e fallback para inserção manual. Conversão apenas na visualização; armazena sempre moeda + valor original.

### 7.4 Melhor dia de compra (cartão)
**Decisão:** calcular por `diaFechamento` e `diaVencimento`. Compra entra na fatura cujo fechamento é o próximo após a data; o melhor dia é `fechamento + 1` (maximiza o prazo até o vencimento, até ~55 dias). Exibir no card e numa seção por mês; valores configuráveis.

### 7.5 Serviço de extração de PDF
**Decisão:** parser **local no microsserviço Python** (`pdfplumber`/`pypdf`) com timeout e fila para PDFs simples e colar-colar; evoluir para OCR (Azure Vision) somente se os PDFs forem imagens/scanner.

### 7.6 Conversão multimoeda
**Decisão:** SGS do BACEN com cache e fallback manual; conversão só em exibição, sem gravar valores convertidos.

### 7.7 Comunicação Next.js ↔ Python
**Decisão:** microsserviço FastAPI expõe `POST /parse` (texto/OFX/CSV/PDF → transações normalizadas) e `POST /categorize` (descrições → categoria+confiança). Next.js consome via HTTP com timeouts e fila; modelo local roda no microsserviço e o treino/aprendizado fica nele também. Em dev, o Next.js cai para um mock local se o serviço Python estiver offline.
