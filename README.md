# Prompt Finanças — Controle Financeiro Pessoal

App multi-usuário de finanças pessoais (BRL + multimoeda) com:
- **Contas bancárias** com saldo inicial e extratos conferíveis
- **Importação em lote** de extratos (colar texto, OFX, CSV, PDF) com leitor inteligente de datas/valores
- **Agenda de contas a pagar** com vencimento; ao pagar, registra banco + conta de onde pagou e gera a transação
- **Categorização automática** por IA (regras agora, ML depois)
- Dashboard com saldos (inicial + extrato), cartões de crédito e investimentos
- Open Finance real via agregador (fase futura)

Arquitetura: **Next.js** (app) + **FastAPI/Python** (microsserviço de parsing/IA) + **MySQL 8** (Docker) + Prisma + NextAuth.

## Estrutura

```
prompt_financas/
├── docs/spec.md          # Especificação refinada (decisões incluídas)
├── docs/historico.md     # Histórico: do prompt original até o estado atual
├── web/                  # Next.js 16 (App Router, TypeScript, Tailwind v4)
│   ├── prisma/schema.prisma
│   └── src/
│       ├── app/dashboard/        # dashboard, contas, cartões, agenda, importar
│       ├── components/           # formulários (auth, importação, contas a pagar)
│       └── lib/                  # auth, prisma, ml (client do microsserviço)
└── ml/                   # FastAPI (Python 3.12, uv)
    └── app/              # routes: /parse/text|csv|ofx|pdf, /categorize, /health
```

## Pré-requisitos

- Node 20+ (projeto usa Node 26 via nvm)
- `uv` para o microsserviço Python
- Docker para MySQL 8

## Subindo o banco

```bash
docker start ps_vendas_db   # ou, se não existir:
docker run -d --name ps_vendas_db \
  -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=vendas \
  -e MYSQL_USER=vendas -e MYSQL_PASSWORD=vendas \
  -p 3306:3306 -v mysqldata:/var/lib/mysql mysql:8.0
```

Criar o banco do app e a estrutura:

```bash
docker exec ps_vendas_db mysql -uroot -proot -e \
  "CREATE DATABASE IF NOT EXISTS financas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
cd web
npx prisma db push
npx prisma db seed    # bancos, categorias padrão, admin (admin@financas.com / admin123)
```

## Rodando

Terminal 1 — microsserviço Python:

```bash
cd ml
uv sync
./.venv/bin/python -m uvicorn app.main:app --port 8000
```

Terminal 2 — app Next.js:

```bash
cd web
cp .env.example .env    # gere um AUTH_SECRET: openssl rand -base64 32
npm install
npm run dev
```

Acesse http://localhost:3000.

## Notas

- Se o microsserviço estiver offline, o app cai para um **mock local** de parsing/categorização (dev).
- O `/parse/pdf` precisa de `python-multipart` (já no pyproject).
- Próximas fases (spec.md §6): categorização com ML+Azure, cartões de crédito completos, investimentos, Open Finance via agregador.
