"""Parsers de extrato: texto livre, CSV, OFX e PDF."""

from datetime import datetime
import re


def _parse_amount(raw: str) -> float:
    """Converte '1.234,56', 'R$ 12,50', '-100,00' em float."""
    cleaned = raw.replace("R$", "").replace("$", "").strip()
    negative = cleaned.startswith("-")
    unsigned = cleaned.lstrip("+-").strip()
    has_dot = "." in unsigned
    has_comma = "," in unsigned

    if has_dot and has_comma:
        if unsigned.rfind(",") > unsigned.rfind("."):
            normalized = unsigned.replace(".", "").replace(",", ".")
        else:
            normalized = unsigned.replace(",", "")
    elif has_comma:
        normalized = unsigned.replace(".", "").replace(",", ".")
    elif has_dot:
        normalized = unsigned.replace(".", "")
    else:
        normalized = unsigned

    try:
        value = float(normalized)
    except ValueError:
        return 0.0
    return -value if negative else value


def _normalize_dd_mm_yyyy(yyyy: str) -> int:
    y = int(yyyy)
    return 1900 + y if y > 70 else 2000 + y


def parse_text(text: str) -> list[dict]:
    """Lê extrato colado. Linhas: 'DESCRICAO  DD/MM/AAAA  1.234,56'."""
    date_re = re.compile(r"\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b")
    amount_re = re.compile(
        r"[-+]?\s?(?:R\$)?\s?([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})|[0-9]{1,3}(?:,[0-9]{2})?)\s*$"
    )
    results: list[dict] = []

    for raw in text.splitlines():
        line = raw.strip()
        dm = date_re.search(line)
        if not dm:
            continue

        dd, mm, yy = dm.group(1), dm.group(2), dm.group(3)
        if len(yy) == 2:
            year = _normalize_dd_mm_yyyy(yy)
        else:
            year = int(yy)
        date = datetime(year, int(mm), int(dd)).isoformat(timespec="seconds")

        am = amount_re.search(line, dm.end())
        if not am:
            continue
        amount = _parse_amount(am.group(0))

        description = (
            (line[: dm.start()] + line[dm.end() : am.start()])
            .replace("  ", " ")
            .strip()
            .strip("-")
            .strip()
            or "Sem descrição"
        )

        results.append({"date": date, "amount": amount, "description": description})

    return results


def parse_csv(content: str) -> list[dict]:
    """Importa CSV. Detecta delimitador ; ou , (padrão BR usa ; e decimal com vírgula)."""
    import csv
    import io

    first_line = content.splitlines()[0] if content.splitlines() else ""
    delimiter = ";" if first_line.count(";") > first_line.count(",") else ","

    reader = csv.DictReader(io.StringIO(content), delimiter=delimiter)
    results: list[dict] = []
    for row in reader:
        date_raw = (row.get("data") or row.get("date") or "").strip()
        desc = (row.get("descricao") or row.get("description") or "").strip()
        value_raw = (row.get("valor") or row.get("amount") or "").strip()
        if not date_raw or not desc or not value_raw:
            continue

        date = None
        for fmt in ("%d/%m/%Y", "%d/%m/%y", "%Y-%m-%d", "%d-%m-%Y"):
            try:
                date = datetime.strptime(date_raw, fmt)
                break
            except ValueError:
                continue
        if date is None:
            continue

        results.append(
            {
                "date": date.isoformat(timespec="seconds"),
                "amount": _parse_amount(value_raw),
                "description": desc,
            }
        )
    return results


def parse_ofx(content: str) -> list[dict]:
    """Importa OFX (SGML/XML) extraindo <STMTTRN> de contas bancárias."""
    re_tags = re.compile(r"<(\w+)>([^<]*)</\1>")
    transactions: list[dict] = []
    current: dict | None = None

    for tag, value in re_tags.findall(content):
        tag = tag.strip()
        value = value.strip()

        if tag == "TRNTYPE":
            current = {}
            transactions.append(current)
        if current is None:
            continue
        if tag == "DTPOSTED":
            dt = value[:8]
            if len(dt) == 8:
                try:
                    current["date"] = datetime(
                        int(dt[0:4]), int(dt[4:6]), int(dt[6:8])
                    ).isoformat(timespec="seconds")
                except ValueError:
                    pass
        elif tag == "TRNAMT":
            try:
                current["amount"] = float(value.replace(",", "."))
            except ValueError:
                current["amount"] = 0.0
        elif tag == "MEMO":
            current["description"] = value or "Sem descrição"

    results = []
    for txn in transactions:
        if txn.get("date") and "amount" in txn:
            results.append(
                {
                    "date": txn["date"],
                    "amount": txn["amount"],
                    "description": txn.get("description") or "Sem descrição",
                }
            )
    return results


def parse_pdf_bytes(pdf_bytes: bytes) -> list[dict]:
    """Extrai texto de PDF e delega ao parser de texto."""
    try:
        from pypdf import PdfReader
        from io import BytesIO

        reader = PdfReader(BytesIO(pdf_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)
    except Exception:
        return []
    return parse_text(text)