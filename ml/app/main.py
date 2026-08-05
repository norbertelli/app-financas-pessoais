"""
Microsserviço Python (FastAPI) do app de finanças.

Endpoints:
- POST /parse/text   : normaliza extrato colado (texto livre) em transações
- POST /parse/csv    : normaliza conteúdo CSV  (a implementar)
- POST /parse/ofx    : normaliza conteúdo OFX  (a implementar)
- POST /parse/pdf    : normaliza PDF enviado   (a implementar)
- POST /categorize   : infere categoria por descrição (regras agora, ML depois)
- GET  /health       : verificação de saúde
"""

from fastapi import FastAPI

from app.routes import health, parse, categorize

app = FastAPI(title="Finanças ML", version="0.1.0")

app.include_router(health.router)
app.include_router(parse.router)
app.include_router(categorize.router)