import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseText, type ParsedTransaction } from "@/lib/ml";

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

  const transactions: ParsedTransaction[] = await parseText(text);
  return NextResponse.json({ transactions });
}
