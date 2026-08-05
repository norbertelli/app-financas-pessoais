#!/usr/bin/env bash
# Derruba o ambiente: app Next.js + microsserviço Python (MySQL continua rodando)
set -e

echo "▶ App Next.js"
if pkill -f "next dev" 2>/dev/null; then
  echo "  parado"
else
  echo "  não estava rodando"
fi

echo "▶ Microsserviço Python"
if pkill -f "uvicorn app.main" 2>/dev/null; then
  echo "  parado"
else
  echo "  não estava rodando"
fi

echo
echo "✔ Ambiente parado. MySQL (ps_vendas_db) segue ativo."
