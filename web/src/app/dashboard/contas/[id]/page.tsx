import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;

  const account = await prisma.account.findFirst({
    where: { id, userId: session.user.id },
    include: {
      bank: true,
      statements: {
        include: { transactions: true },
        orderBy: { period: "desc" },
      },
      transactions: {
        include: { category: true },
        orderBy: { date: "desc" },
      },
    },
  });

  if (!account) notFound();

  const confirmed = account.transactions.filter(
    (t) => t.status === "CONFIRMADA"
  );
  const balance =
    account.openingBalance.toNumber() +
    confirmed.reduce((s, t) => s + t.amount.toNumber(), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/contas"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Contas
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{account.name}</h1>
          <p className="text-sm text-slate-500">
            {account.bank?.name ?? "Sem banco"} · Saldo inicial {brl(account.openingBalance.toNumber())} ·{" "}
            {account.currency}
          </p>
        </div>
        <p className="text-2xl font-bold">{brl(balance)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Extratos</h2>
          <div className="space-y-3">
            {account.statements.map((st) => (
              <div
                key={st.id}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Período {st.period}</span>
                  <span className="text-sm">
                    {st.closingBalance
                      ? brl(st.closingBalance.toNumber())
                      : "—"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {st.transactions.length} transações · {st.source}
                </p>
              </div>
            ))}
            {account.statements.length === 0 && (
              <p className="text-sm text-slate-500">
                Nenhum extrato. Importe transações para conferência.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Transações</h2>
          <div className="space-y-2">
            {account.transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded border border-slate-100 bg-white p-3"
              >
                <div>
                  <p className="text-sm font-medium">{t.description}</p>
                  <p className="text-xs text-slate-500">
                    {t.date.toLocaleDateString("pt-BR")} ·{" "}
                    {t.category?.name ?? "Sem categoria"} · {t.status}
                  </p>
                </div>
                <span
                  className={
                    t.amount.toNumber() < 0
                      ? "font-medium text-red-600"
                      : "font-medium text-green-600"
                  }
                >
                  {brl(t.amount.toNumber())}
                </span>
              </div>
            ))}
            {account.transactions.length === 0 && (
              <p className="text-sm text-slate-500">Nenhuma transação ainda.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
