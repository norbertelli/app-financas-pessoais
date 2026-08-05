"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export type CardImportRow = {
  date: string;
  amount: number;
  description: string;
  installments: number;
  installmentCurrent: number;
  competence: string;
};

function toDecimal(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function importCardTransactions(
  cardId: string,
  rows: CardImportRow[]
) {
  const session = await auth();
  if (!session?.user) return { error: "Não autenticado." };

  if (rows.length === 0) return { error: "Nenhuma transação." };

  const card = await prisma.creditCard.findFirst({
    where: { id: cardId, userId: session.user.id },
  });
  if (!card) return { error: "Cartão não encontrado." };

  const competenceMap = new Map<string, string>();

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const date = new Date(`${row.date}T12:00:00`);
      if (isNaN(date.getTime())) continue;
      const amount = toDecimal(row.amount);
      if (amount === 0) continue;

      let statementId = competenceMap.get(row.competence);
      if (!statementId) {
        const st = await tx.creditCardStatement.upsert({
          where: { cardId_competence: { cardId, competence: row.competence } },
          create: {
            cardId,
            competence: row.competence,
            total: 0,
            previousBalance: 0,
          },
          update: {},
        });
        statementId = st.id;
        competenceMap.set(row.competence, statementId);
      }

      const existing = await tx.creditCardTransaction.findUnique({
        where: {
          cardId_purchaseDate_amount_description: {
            cardId,
            purchaseDate: date,
            amount,
            description: row.description,
          },
        },
      });
      if (existing) continue;

      await tx.creditCardTransaction.create({
        data: {
          statementId,
          cardId,
          purchaseDate: date,
          amount,
          description: row.description,
          installments: row.installments,
          installmentCurrent: row.installmentCurrent,
          currency: card.currency,
        },
      });
    }

    // recalcula totais de cada fatura alterada
    for (const sid of competenceMap.values()) {
      const sum = await tx.creditCardTransaction.aggregate({
        where: { statementId: sid },
        _sum: { amount: true },
      });
      await tx.creditCardStatement.update({
        where: { id: sid },
        data: { total: sum._sum.amount ?? 0 },
      });
    }
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cartoes");
  revalidatePath(`/dashboard/cartoes/${cardId}`);
  return { ok: true, rows: rows.length };
}

export async function markStatementPaid(statementId: string, paid: boolean) {
  const session = await auth();
  if (!session?.user) return;

  const statement = await prisma.creditCardStatement.findFirst({
    where: {
      id: statementId,
      card: { userId: session.user.id },
    },
  });
  if (!statement) return;

  await prisma.creditCardStatement.update({
    where: { id: statementId },
    data: { paid },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/cartoes/${statement.cardId}`);
}
