export type ParsedTransaction = {
  date: string;
  amount: number;
  description: string;
};

export type CategorizeResult = {
  description: string;
  category: string | null;
  confidence: number;
};

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL ?? "http://localhost:8000";

export class MLServiceError extends Error {}

async function callService<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const res = await fetch(`${ML_SERVICE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      throw new MLServiceError(`Serviço de IA retornou ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof MLServiceError) throw error;
    throw new MLServiceError(
      `Serviço de IA indisponível em ${ML_SERVICE_URL}`
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function parseText(text: string): Promise<ParsedTransaction[]> {
  try {
    const result = await callService<{ transactions: ParsedTransaction[] }>(
      "/parse/text",
      { text }
    );
    return result.transactions;
  } catch {
    return mockParseText(text);
  }
}

export async function categorize(
  descriptions: string[]
): Promise<CategorizeResult[]> {
  try {
    const result = await callService<{ results: CategorizeResult[] }>(
      "/categorize",
      { descriptions }
    );
    return result.results;
  } catch {
    return mockCategorize(descriptions);
  }
}

function mockParseText(text: string): ParsedTransaction[] {
  const lines = text.split(/\r?\n/);
  const transactions: ParsedTransaction[] = [];

  const dateRe = /\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/;
  const amountRe = /[-+]?\s?R?\$?\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})|\d{1,3}(?:,\d{2})?)/i;

  for (const raw of lines) {
    const line = raw.trim();
    const dateMatch = line.match(dateRe);
    if (!dateMatch) continue;

    const amountMatch = line.match(amountRe);
    if (!amountMatch) continue;

    const amount = parseAmount(amountMatch[1]);

    let description = line
      .replace(dateRe, "")
      .replace(amountRe, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!description) description = "Sem descrição";

    transactions.push({
      date: normalizeDate(dateMatch),
      amount,
      description,
    });
  }

  return transactions;
}

function normalizeDate(match: RegExpMatchArray): string {
  const dd = match[1].padStart(2, "0");
  const mm = match[2].padStart(2, "0");
  let yyyy = match[3];
  if (yyyy.length === 2) {
    const year = Number(yyyy);
    yyyy = String(year > 70 ? 1900 + year : 2000 + year);
  }
  return `${yyyy}-${mm}-${dd}`;
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[^0-9.,-]/g, "");
  const negative = cleaned.startsWith("-");
  const unsigned = cleaned.replace(/^[+-]/, "");
  const hasDot = unsigned.includes(".");
  const hasComma = unsigned.includes(",");

  let normalized: string;
  if (hasComma && hasDot) {
    if (unsigned.lastIndexOf(",") > unsigned.lastIndexOf(".")) {
      normalized = unsigned.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = unsigned.replace(",", "");
    }
  } else if (hasComma) {
    normalized = unsigned.replace(".", "").replace(",", ".");
  } else {
    normalized = unsigned.replace(/\./g, "");
    if (normalized.length <= 2) normalized = unsigned;
  }

  const value = Number(normalized);
  if (Number.isNaN(value)) return 0;
  return negative ? -value : value;
}

const MOCK_RULES: Array<[RegExp, string]> = [
  [/padaria|mercado|mercado livre|supermercado|restaurante|ifood/i, "Alimentação"],
  [/aluguel|condominio|energia|agua|internet|iptu|ipva/i, "Moradia"],
  [/uber|99taxi|posto|combustivel|pedagio|estacionamento/i, "Transporte"],
  [/farmacia|drogaria|consultorio|medico/i, "Saúde"],
  [/escola|curso|faculdade|kindle|livro/i, "Educação"],
  [/cinema|netflix|spotify|steam|show|jogo/i, "Lazer"],
  [/salary|salario|pix recebido|recebido/i, "Salário"],
  [/pix|ted|transferencia/i, "Transferência"],
];

function mockCategorize(descriptions: string[]): CategorizeResult[] {
  return descriptions.map((description) => {
    for (const [re, category] of MOCK_RULES) {
      if (re.test(description)) {
        return { description, category, confidence: 0.9 };
      }
    }
    return { description, category: "Outros", confidence: 0.4 };
  });
}