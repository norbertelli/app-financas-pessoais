from app.parsers import parse_csv, parse_ofx, parse_text


def test_parse_text_amounts_and_dates():
    sample = """SALARIO PIX RECEBIDO  05/08/2026  2.500,00
MERCADO PAGO AGORA  04/08/2026  250,43
PAGAMENTO TAXA   02/08/26  -89,90
"""
    result = parse_text(sample)
    assert len(result) == 3
    assert result[0]["amount"] == 2500.00
    assert result[0]["description"].startswith("SALARIO")
    assert result[1]["amount"] == 250.43
    assert result[2]["amount"] == -89.90
    assert result[2]["date"].startswith("2026-08-02")


def test_parse_csv_br_semicolon():
    csv_content = "data;descricao;valor\n01/08/2026;MERCADO;450,90\n02/08/2026;IFOOD;89,90\n"
    result = parse_csv(csv_content)
    assert len(result) == 2
    assert result[0]["amount"] == 450.90
    assert result[1]["amount"] == 89.90


def test_parse_ofx_block():
    ofx = """<STMTTRN>
<TRNTYPE>DEBIT</TRNTYPE>
<DTPOSTED>20260805</DTPOSTED>
<TRNAMT>-150.00</TRNAMT>
<MEMO>MERCADO</MEMO>
</STMTTRN>"""
    result = parse_ofx(ofx)
    assert len(result) == 1
    assert result[0]["amount"] == -150.00
    assert result[0]["description"] == "MERCADO"