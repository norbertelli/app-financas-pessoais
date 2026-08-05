import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { ImportForm } from "@/components/import-form";

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) return null;

  const accounts = await prisma.account.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true },
    orderBy: { order: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Importar extrato</h1>
        <Link
          href="/dashboard"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Voltar
        </Link>
      </div>

      {accounts.length === 0 ? (
        <p className="text-slate-500">
          Você precisa de pelo menos uma conta.{" "}
          <Link
            href="/dashboard/contas"
            className="text-slate-900 underline"
          >
            Criar conta
          </Link>
        </p>
      ) : (
        <ImportForm accounts={accounts} />
      )}
    </div>
  );
}
