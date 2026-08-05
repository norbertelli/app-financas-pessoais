"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type { ParsedTransaction } from "@/lib/ml";

export async function importTransactions(
  accountId: string,
  period: string,
  transactions: ParsedTransaction[]
) {
  const session = await auth();
  if (!session?.user) return { error: "Não autenticado." };

  if (transactions.length === 0) return { error: "Nenhuma transação." };

  const account = await prisma.account.findFirst({
    where: { id: accountId, userId: session.user.id },
  });
  if (!account) return { error: "Conta não encontrada." };

  const statement = await prisma.statement.create({
    data: {
      accountId,
      period,
      source: "TEXTO",
      openingBalance: account.openingBalance,
    },
  });

  let imported = 0;
  for (const tx of transactions) {
    const date = new Date(`${tx.date}T12:00:00`);
    if (isNaN(date.getTime())) continue;

    const amount = tx.amount;
    const type = amount < 0 ? "DESPESA" : "RECEITA";

    const existing = await prisma.transaction.findUnique({
      where: {
        accountId_date_amount_description: {
          accountId,
          date,
          amount,
          description: tx.description,
        },
      },
    });
    if (existing) continue;

    await prisma.transaction.create({
      data: {
        statementId: statement.id,
        accountId,
        date,
        amount,
        description: tx.description,
        type,
        status: "CONFIRMADA",
        currency: account.currency,
        rawText: tx.description,
      },
    });
    imported++;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/contas/${accountId}`);

  return { imported, statementId: statement.id };
}
