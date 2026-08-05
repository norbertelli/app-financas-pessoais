#!/usr/bin/env bash
# Sobe o ambiente completo: MySQL + microsserviço Python + app Next.js
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

run_bg() {
  local log="$1"; shift
  nohup setsid "$@" > "$log" 2>&1 < /dev/null &
  disown 2>/dev/null || true
}

echo "▶ MySQL"
if ! docker ps --format '{{.Names}}' | grep -q '^ps_vendas_db$'; then
  docker start ps_vendas_db 2>/dev/null || \
    docker run -d --name ps_vendas_db \
      -e MYSQL_ROOT_PASSWORD=root -e MYSQL_DATABASE=vendas \
      -e MYSQL_USER=vendas -e MYSQL_PASSWORD=vendas \
      -p 3306:3306 -v mysqldata:/var/lib/mysql mysql:8.0
  echo "  MySQL iniciado"
else
  echo "  MySQL já rodando"
fi

# Garante o banco do app (idempotente)
docker exec ps_vendas_db mysql -uroot -proot -e \
  "CREATE DATABASE IF NOT EXISTS financas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" \
  2>/dev/null || true

echo "▶ Microsserviço Python (FastAPI)"
if pgrep -f "uvicorn app.main" >/dev/null 2>&1; then
  echo "  Já rodando na porta 8000"
else
  (cd "$ROOT/ml" && run_bg /tmp/ml_server.log .venv/bin/python -m uvicorn app.main:app --port 8000)
  sleep 3
  if curl -s -m 3 http://localhost:8000/health >/dev/null; then
    echo "  Iniciado em http://localhost:8000"
  else
    echo "  AVISO: não respondeu na porta 8000 (ver /tmp/ml_server.log)"
  fi
fi

echo "▶ App Next.js"
if pgrep -f "next dev" >/dev/null 2>&1; then
  echo "  Já rodando em http://localhost:3000"
else
  (cd "$ROOT/web" && run_bg /tmp/next_dev.log npx next dev -p 3000)
  # espera a primeira compilação (FS lento) por até 30s
  for _ in $(seq 1 15); do
    sleep 2
    if curl -s -m 3 -o /dev/null http://localhost:3000/login; then
      break
    fi
  done
  if curl -s -m 3 -o /dev/null http://localhost:3000/login; then
    echo "  Iniciado em http://localhost:3000"
  else
    echo "  AVISO: não respondeu (ver /tmp/next_dev.log)"
  fi
fi

echo
echo "✔ Acesse http://localhost:3000  (microsserviço: http://localhost:8000)"