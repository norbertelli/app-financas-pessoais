import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseCardText, addMonths, type CardRow } from "@/lib/card-parse";

export type ProjRow = CardRow & { competence: string };

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { text } = (await request.json()) as { text?: string };
  if (!text || !text.trim()) {
    return NextResponse.json(
      { error: "Nenhum texto para analisar." },
      { status: 400 }
    );
  }

  const rows = parseCardText(text);

  // projeta os meses de competência (corrente + futuros) por parcela
  const projected: ProjRow[] = [];
  for (const row of rows) {
    for (let i = row.installmentCurrent; i <= row.installments; i++) {
      projected.push({
        ...row,
        competence: addMonths(row.date, i - row.installmentCurrent),
      });
    }
  }

  return NextResponse.json({ transactions: projected });
}