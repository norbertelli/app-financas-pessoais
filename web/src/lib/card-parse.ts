export type CardRow = {
  date: string;
  amount: number;
  description: string;
  installments: number;
  installmentCurrent: number;
  raw: string;
};

function normalizeDate(dd: string, mm: string, yy: string): string {
  const d = dd.padStart(2, "0");
  const m = mm.padStart(2, "0");
  let y = yy;
  if (y.length === 2) {
    const n = Number(y);
    y = String(n > 70 ? 1900 + n : 2000 + n);
  }
  return `${y}-${m}-${d}`;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.,-]/g, "");
  const negative = cleaned.startsWith("-");
  const unsigned = cleaned.replace(/^[+-]/, "");
  const hasDot = unsigned.includes(".");
  const hasComma = unsigned.includes(",");

  let normalized: string;
  if (hasDot && hasComma) {
    normalized =
      unsigned.lastIndexOf(",") > unsigned.lastIndexOf(".")
        ? unsigned.replace(/\./g, "").replace(",", ".")
        : unsigned.replace(",", "");
  } else if (hasComma) {
    normalized = unsigned.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = unsigned.replace(/\./g, "");
  }
  const n = Number(normalized);
  if (Number.isNaN(n)) return 0;
  return negative ? -n : n;
}

function detectInstallments(description: string): {
  installments: number;
  current: number;
} {
  const parcelaRe = /parcela[s]?\s*(\d{1,2})\s*\/\s*(\d{1,2})/i;
  const xRe = /(\d{1,2})\s*[xX]\s*de/i;
  const slashRe = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\s|$)/;
  const xNumRe = /(\d{1,2})\s*[xX]\b/;

  const pm = description.match(parcelaRe);
  if (pm) {
    const current = parseInt(pm[1], 10);
    const total = parseInt(pm[2], 10);
    if (current >= 1 && total >= current) return { installments: total, current };
  }

  const xm = description.match(xRe) ?? description.match(xNumRe);
  if (xm) {
    const total = parseInt(xm[1], 10);
    if (total >= 2) return { installments: total, current: 1 };
  }

  const sm = description.match(slashRe);
  if (sm) {
    const current = parseInt(sm[1], 10);
    const total = parseInt(sm[2], 10);
    if (current >= 1 && total >= current && total >= 2) {
      return { installments: total, current };
    }
  }

  return { installments: 1, current: 1 };
}

export function parseCardText(text: string): CardRow[] {
  const dateRe = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;
  const amountRe = /[-+]?\s?R?\$?\s?([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})|[0-9]{1,3}(?:,\d{2})?)\s*$/;

  const rows: CardRow[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const dm = line.match(dateRe);
    if (!dm) continue;
    const afterDate = line.slice(dm.index! + dm[0].length);
    const am = afterDate.match(amountRe);
    if (!am) continue;

    const descPart = afterDate.slice(0, afterDate.lastIndexOf(am[0]));
    const description = (line.slice(0, dm.index) + descPart)
      .replace(/\s+/g, " ")
      .trim();

    const { installments, current } = detectInstallments(description);

    rows.push({
      date: normalizeDate(dm[1], dm[2], dm[3]),
      amount: parseAmount(am[0]),
      description: description || "Sem descrição",
      installments,
      installmentCurrent: current,
      raw: line,
    });
  }
  return rows;
}

export function addMonths(dateStr: string, months: number): string {
  const [y, m] = dateStr.slice(0, 7).split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}
