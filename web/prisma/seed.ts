import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SYSTEM_CATEGORIES = [
  { name: "Alimentação", type: "DESPESA", icon: "🍽️", color: "#f59e0b" },
  { name: "Moradia", type: "DESPESA", icon: "🏠", color: "#8b5cf6" },
  { name: "Transporte", type: "DESPESA", icon: "🚗", color: "#3b82f6" },
  { name: "Saúde", type: "DESPESA", icon: "🩺", color: "#ef4444" },
  { name: "Educação", type: "DESPESA", icon: "📚", color: "#06b6d4" },
  { name: "Lazer", type: "DESPESA", icon: "🎮", color: "#ec4899" },
  { name: "Compras", type: "DESPESA", icon: "🛒", color: "#10b981" },
  { name: "Salário", type: "RECEITA", icon: "💰", color: "#22c55e" },
  { name: "Transferência", type: "TRANSFERENCIA", icon: "🔁", color: "#64748b" },
  { name: "Outros", type: "DESPESA", icon: "📦", color: "#78716c" },
];

const BANKS = [
  { code: "001", name: "Banco do Brasil" },
  { code: "104", name: "Caixa Econômica Federal" },
  { code: "237", name: "Bradesco" },
  { code: "341", name: "Itaú Unibanco" },
  { code: "033", name: "Santander" },
  { code: "260", name: "Nubank" },
  { code: "290", name: "PagSeguro" },
  { code: "380", name: "PicPay" },
  { code: "623", name: "Banco Pan" },
  { code: "212", name: "Banco Original" },
];

async function main() {
  for (const bank of BANKS) {
    await prisma.bank.upsert({
      where: { code: bank.code },
      update: { name: bank.name },
      create: bank,
    });
  }

  for (const cat of SYSTEM_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: { isSystem: true, name: cat.name },
    });
    if (!existing) {
      await prisma.category.create({
        data: { ...cat, isSystem: true, type: cat.type as never },
      });
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@financas.com";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        name: "Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
      },
    });
  }

  console.log("Seed concluído: bancos, categorias padrão e admin criados.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
