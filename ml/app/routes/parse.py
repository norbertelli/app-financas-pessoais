from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.parsers import parse_csv, parse_ofx, parse_pdf_bytes, parse_text

router = APIRouter(prefix="/parse", tags=["parse"])


class TextRequest(BaseModel):
    text: str


class CSVRequest(BaseModel):
    content: str


class OFXRequest(BaseModel):
    content: str


@router.post("/text")
def parse_text_endpoint(req: TextRequest) -> dict:
    if not req.text.strip():
        raise HTTPException(status_code=400, detail="Texto vazio.")
    return {"transactions": parse_text(req.text)}


@router.post("/csv")
def parse_csv_endpoint(req: CSVRequest) -> dict:
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="CSV vazio.")
    return {"transactions": parse_csv(req.content)}


@router.post("/ofx")
def parse_ofx_endpoint(req: OFXRequest) -> dict:
    if not req.content.strip():
        raise HTTPException(status_code=400, detail="OFX vazio.")
    return {"transactions": parse_ofx(req.content)}


@router.post("/pdf")
async def parse_pdf_endpoint(file: UploadFile = File(...)) -> dict:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Arquivo vazio.")
    return {"transactions": parse_pdf_bytes(content)}