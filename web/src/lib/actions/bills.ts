"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function toDate(value: string, fallback: string): Date {
  const d = new Date(`${value}T12:00:00`);
  return isNaN(d.getTime()) ? new Date(fallback) : d;
}

export async function createBill(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const name = String(formData.get("name") || "").trim();
  const dueDate = String(formData.get("dueDate") || "");
  const amount = parseFloat(
    String(formData.get("amount") || "0").replace(",", ".")
  );

  if (!name) return;

  await prisma.bill.create({
    data: {
      userId: session.user.id,
      name,
      dueDate: toDate(dueDate, new Date().toISOString().slice(0, 10)),
      amount: isNaN(amount) ? 0 : amount,
    },
  });

  revalidatePath("/dashboard/agenda");
}

export async function payBill(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id") || "");
  const accountId = String(formData.get("accountId") || "");
  const paidDateRaw = String(formData.get("paidDate") || "");

  const bill = await prisma.bill.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!bill) return;
  if (bill.status === "PAGO") return;

  const account = accountId
    ? await prisma.account.findFirst({
        where: { id: accountId, userId: session!.user.id },
        include: { bank: true },
      })
    : null;

  const paidAt = paidDateRaw
    ? new Date(`${paidDateRaw}T12:00:00`)
    : new Date();

  await prisma.$transaction(async (tx) => {
    await tx.bill.update({
      where: { id },
      data: {
        status: "PAGO",
        paidAt,
        paidBankId: account?.bankId ?? null,
        paidAccountId: account?.id ?? null,
      },
    });

    if (account) {
      await tx.transaction.create({
        data: {
          accountId: account.id,
          date: paidAt,
          amount: -bill.amount,
          description: `Pagamento: ${bill.name}`,
          type: "DESPESA",
          status: "CONFIRMADA",
          currency: account.currency,
        },
      });
    }
  });

  revalidatePath("/dashboard/agenda");
  revalidatePath("/dashboard");
  if (account) revalidatePath(`/dashboard/contas/${account.id}`);
}

export async function cancelBill(id: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.bill.updateMany({
    where: { id, userId: session.user.id, status: "PENDENTE" },
    data: { status: "CANCELADA" },
  });

  revalidatePath("/dashboard/agenda");
}

export async function deleteBill(id: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.bill.deleteMany({ where: { id, userId: session.user.id } });
  revalidatePath("/dashboard/agenda");
}
