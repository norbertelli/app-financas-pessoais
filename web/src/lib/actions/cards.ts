"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function toInt(value: string): number {
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? 0 : Math.max(1, Math.min(31, n));
}

function toLimit(value: string): number {
  const n = parseFloat(String(value).replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

export async function createCard(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const name = String(formData.get("name") || "").trim();
  const bankCode = String(formData.get("bankCode") || "").trim();
  const lastDigits = String(formData.get("lastDigits") || "").trim();
  const closingDay = toInt(String(formData.get("closingDay") || "1"));
  const dueDay = toInt(String(formData.get("dueDay") || "10"));

  if (!name) return;

  const bank = bankCode
    ? await prisma.bank.findUnique({ where: { code: bankCode } })
    : null;

  await prisma.creditCard.create({
    data: {
      userId: session.user.id,
      bankId: bank?.id,
      name,
      lastDigits: lastDigits || null,
      closingDay,
      dueDay,
      bestPurchaseDay: closingDay + 1 > 31 ? 1 : closingDay + 1,
      limit: toLimit(String(formData.get("limit") || "0")),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cartoes");
}

export async function updateCard(formData: FormData) {
  const session = await auth();
  if (!session?.user) return;

  const id = String(formData.get("id") || "");
  const card = await prisma.creditCard.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!card) return;

  const closing = toInt(String(formData.get("closingDay") || card.closingDay));
  const due = toInt(String(formData.get("dueDay") || card.dueDay));

  await prisma.creditCard.update({
    where: { id },
    data: {
      name: String(formData.get("name") || card.name).trim(),
      lastDigits:
        String(formData.get("lastDigits") || "").trim() || card.lastDigits,
      closingDay: closing,
      dueDay: due,
      bestPurchaseDay: closing + 1 > 31 ? 1 : closing + 1,
      limit: toLimit(String(formData.get("limit") || "0")),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cartoes");
}

export async function deleteCard(id: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.creditCard.deleteMany({
    where: { id, userId: session.user.id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/cartoes");
}