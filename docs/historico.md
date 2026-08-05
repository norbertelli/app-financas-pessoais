# Histórico do Projeto — Prompt Finanças

Registro da evolução do projeto, do prompt original até o estado atual. Documento vivo: atualize a cada fase.

---

## 1. Origem (o prompt inicial)

O arquivo `/home/beto/meus-projetos/prompt finanças` pedia um **app de finanças pessoais** com 11 requisitos:

1. Ferramenta para colar texto de extratos (copiar/colar de apps bancários ou arquivos) com leitor inteligente de datas, valores e categorias para importação em lote.
2. Usar Open Finance.
3. Tabela de bancos (número, nome, agência, contas, saldo inicial).
4. Tabela de extrato para cada banco.
5. Tabela de cartão de crédito com dia de vencimento e melhor dia de compra.
6. Tabela de extrato para cada cartão, com meses à frente enquanto houver dívida.
7. Tabela de investimento (instituição, saldo inicial).
8. Tabela de extrato de investimento (movimentações).
9. Dashboard: saldo final de cada extrato somado ao saldo inicial.
10. Ao clicar em cada saldo, visualizar o extrato para conferência.

---

## 2. Refinamento da especificação

Na primeira sessão, o prompt foi refinado com decisões do usuário:

| Ponto | Decisão |
|---|---|
| Open Finance | **Integração real** (não só manual) |
| Categorização | **IA/ML** (com aprendizado) |
| Usuários | **Multi-usuário com login** |
| Categorias | **Pré-definidas + customizáveis** |
| Stack | **Next.js + Prisma + MySQL** (padrão `prompt_site_vendas`) |
| Formatos de importação | **OFX, CSV, PDF** + colar texto |
| Investimentos | **Open Finance quando disponível + manual/fallback** |
| Moeda | **BRL + multimoeda** |

### 2.1 Decisões técnicas (recomendadas e aceitas)

- **Credenciamento Open Finance:** desenvolvimento contra sandbox + **agregador participante** atrás de uma interface `OFProvider`; mock em dev.
- **IA de categorização:** **híbrida** — modelo local (fasttext/embedding) + **Azure OpenAI** como refinador quando a confiança é baixa.
- **Taxa de câmbio:** **API SGS do Banco Central** com cache e fallback manual; conversão só na visualização.
- **Melhor dia de compra:** `diaFechamento + 1` (maximiza o prazo até o vencimento, até ~55 dias).
- **PDF:** parser server-side com fallback para OCR (Azure Vision) apenas para scanner.
- **Arquitetura:** **Next.js como app principal + microsserviço Python (FastAPI)** só para parsing/categorização — Python brilha no ML/parsing e o Next reaproveita o stack já dominado.

Especificação completa (com modelagem de dados) em [`docs/spec.md`](./spec.md).

---

## 3. Implementação

### Fase 0 — Infraestrutura
- MySQL 8 no Docker (`ps_vendas_db`, volume `mysqldata`) e banco `financas`.
- Estrutura do projeto:
  ```
  prompt_financas/
  ├── docs/spec.md       # especificação refinada
  ├── web/               # Next.js 16 + Prisma + NextAuth
  ├── ml/                # FastAPI (Python 3.12, uv)
  ├── start.sh           # sobe MySQL + ML + app
  └── stop.sh            # derruba ML + app
  ```

### Fase 1 — MVP manual (auth, contas, importação, dashboard)
- **Auth:** NextAuth v5 (credentials + JWT), páginas de entrar/cadastrar em uma única tela centralizada com abas (componente `auth-card`).
- **Modelo Prisma:** `User`, `Category` (sistema + do usuário), `Bank`, `Account`, `Statement`, `Transaction` (com dedup único `accountId+date+amount+description`), `CreditCard`, `CreditCardStatement`, `CreditCardTransaction`, `Investment`, `InvestmentTransaction`, `OFConsent`, `OFConnection`.
- **Dashboard** (`/dashboard`): saldos por conta (saldo inicial + Σ transações), cartões (faturas em aberto) e investimentos.
- **Contas** (`/dashboard/contas`): CRUD com saldo inicial; página de detalhe com **extrato para conferência**.
- **Importação em lote** (`/dashboard/importar`): colar texto → parse → **preview editável** → confirmação; transações entram `CONFIRMADA`, com detecção de duplicados.

### Fase 2 — Agenda de contas a pagar
- **Modelo `Bill`** adicionado ao schema.
- **Agenda** (`/dashboard/agenda`): cadastro com vencimento; ao **pagar**, o usuário informa a **data do pagamento** e a **conta debitada**; o banco é derivado automaticamente da conta.
- **Baixa automática:** o pagamento cria uma transação `CONFIRMADA` negativa na conta referenciada, **na data informada**, atualizando o saldo da conta e do dashboard (revalidação incluída).

### Fase 3 — Cartões de crédito
- **CRUD de cartões** (`/dashboard/cartoes`): nome, banco, final, **fechamento**, **vencimento**, **limite**; **melhor dia de compra** calculado automaticamente (fechamento + 1).
- **Extrato por cartão** (`/dashboard/cartoes/[id]`): faturas por competência com total, status (paga/futura) e lançamentos para conferência; botão marcar/reabrir fatura paga.
- **Importação de fatura:** colar texto com detecção de **parcelas** (`10X`, `12X DE`, `parcela 3/6`) → gera lançamentos na **competência corrente e meses futuros** (cria faturas à frente) — atendendo o requisito "meses a frente enquanto tiver dívida".

### Microsserviço Python (ml/)
- FastAPI com `/parse/text|csv|ofx|pdf` e `/categorize` (regras + confiança; espaço para ML futuro) e `/health`; rota raiz amigável orientando para a porta do app.
- Parsers de texto (datas dd/mm/aa/aaaa, valores R$ 1.234,56), CSV (delimitador `;`/`,` automático), OFX (SGML/XML) e PDF (via `pypdf`).
- 3 testes de parser (`pytest`) passando.
- **Fallback:** quando o microsserviço está offline, o app usa um **mock local** de parsing/categorização (dev).

---

## 4. Estado atual (checklist)

| Módulo | Status |
|---|---|
| Auth multi-usuário (entrar/cadastrar) | ✅ |
| Bancos + contas (saldo inicial, agência, número) | ✅ |
| Extrato de conta para conferência | ✅ |
| Importação por colar texto (preview editável, dedup) | ✅ |
| Agenda de contas a pagar (vencimento, pagamento, baixa no saldo) | ✅ |
| Cartões de crédito (fechamento, vencimento, melhor dia de compra, limite) | ✅ |
| Extrato de cartão (faturas correntes + futuras, parcelas) | ✅ |
| Marcar fatura como paga | ✅ |
| Importação OFX/CSV/PDF (parser no microsserviço) | ⏳ endpoints prontos, UI só de texto |
| Investimentos (tabelas + extrato) | ⏳ modelo pronto, UI pendente |
| Categorização automática na importação | ⏳ endpoint pronto, integração na UI pendente |
| Open Finance real | 🔜 fase futura (agregador) |
| Multimoeda (SGS BACEN) | 🔜 fase futura |

---

## 5. Como rodar

```bash
./start.sh        # sobe MySQL + microsserviço (8000) + app (3000)
./stop.sh         # derruba app + microsserviço (mantém MySQL)
```

- App: http://localhost:3000 — usuário de teste: `admin@financas.com` / `admin123`
- Microsserviço: http://localhost:8000 (não abrir no navegador)

Atalhos alternativos: ícones na Área de trabalho (`finanças-iniciar` / `finanças-parar`) e aliases no terminal (`finanças`, `finanças-parar`).

---

## 6. Próximos passos (alinhado ao `spec.md` §6)

1. UI de importação OFX/CSV/PDF no app (endpoints já existem no microsserviço).
2. Integração da categorização (`POST /categorize`) na importação de contas.
3. Investimentos: CRUD + extrato + saldo no dashboard.
4. Multimoeda com taxa SGS do Banco Central.
5. Open Finance via agregador (interface `OFProvider` + consentimento).
6. Categorização com modelo local + Azure OpenAI (feedback do usuário).
