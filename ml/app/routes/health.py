from fastapi import APIRouter

router = APIRouter()


@router.get("/")
def root() -> dict:
    return {
        "service": "financas-ml",
        "message": "Este é o microsserviço do app. O app fica em http://localhost:3000",
        "endpoints": ["/health", "/parse/text", "/parse/csv", "/parse/ofx", "/parse/pdf", "/categorize"],
    }


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}
