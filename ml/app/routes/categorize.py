import re

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["categorize"])

CATEGORIES = [
    "Alimentação",
    "Moradia",
    "Transporte",
    "Saúde",
    "Educação",
    "Lazer",
    "Compras",
    "Salário",
    "Transferência",
    "Outros",
]

RULES: list[tuple[str, str, float]] = [
    (r"padaria|mercado|supermercado|restaurante|ifood|acougue|feira", "Alimentação", 0.95),
    (r"aluguel|condominio|energia|eletrica|agua|saneamento|internet|telefone|iptu|ipva", "Moradia", 0.95),
    (r"uber|99taxi|combustivel|posto|pedagio|estacionamento|santander|buser", "Transporte", 0.9),
    (r"farmacia|drogaria|consultorio|medico|hospital|dentista", "Saúde", 0.95),
    (r"escola|curso|faculdade|livro|kindle", "Educação", 0.9),
    (r"cinema|netflix|spotify|steam|playstation|show|ingresso", "Lazer", 0.9),
    (r"salary|salario|holerite|pix recebido|recebido|renda", "Salário", 0.9),
    (r"pix|ted|transferencia|doc", "Transferência", 0.85),
    (r"shopee|magalu|amazon|mercado livre|casas bahia|internacional", "Compras", 0.9),
]


def _categorize(description: str) -> dict:
    for pattern, category, confidence in RULES:
        if re.search(pattern, description, re.IGNORECASE):
            return {"category": category, "confidence": confidence}
    return {"category": "Outros", "confidence": 0.4}


class CategorizeRequest(BaseModel):
    descriptions: list[str]


@router.post("/categorize")
def categorize_endpoint(req: CategorizeRequest) -> dict:
    results = [
        {"description": d, **_categorize(d)}
        for d in req.descriptions
    ]
    return {"results": results, "categories": CATEGORIES}
