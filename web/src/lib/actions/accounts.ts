"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function createAccount(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const name = String(formData.get("name") || "").trim();
  const bankCode = String(formData.get("bankCode") || "").trim();
  const agency = String(formData.get("agency") || "").trim();
  const number = String(formData.get("number") || "").trim();
  const openingBalance = parseFloat(
    String(formData.get("openingBalance") || "0").replace(",", ".")
  );

  if (!name) return;

  const bank = bankCode
    ? await prisma.bank.findUnique({ where: { code: bankCode } })
    : null;

  const count = await prisma.account.count({ where: { userId: session.user.id } });

  await prisma.account.create({
    data: {
      userId: session.user.id,
      bankId: bank?.id,
      name,
      agency: agency || null,
      number: number || null,
      openingBalance: isNaN(openingBalance) ? 0 : openingBalance,
      order: count,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contas");
}

export async function deleteAccount(id: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.account.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contas");
}
