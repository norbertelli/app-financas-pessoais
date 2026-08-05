import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const brl = (value: { toNumber: () => number } | number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(typeof value === "number" ? value : value.toNumber());

async function getDashboardData(userId: string) {
  const [accounts, creditCards, investments] = await Promise.all([
    prisma.account.findMany({
      where: { userId },
      include: {
        transactions: {
          where: { status: { not: "EXCLUIDA" } },
          select: { amount: true, type: true, currency: true },
        },
      },
      orderBy: { order: "asc" },
    }),
    prisma.creditCard.findMany({
      where: { userId },
      include: {
        statements: { select: { total: true, paid: true } },
      },
    }),
    prisma.investment.findMany({
      where: { userId },
      include: {
        transactions: { select: { amount: true, type: true } },
      },
    }),
  ]);

  return { accounts, creditCards, investments };
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) return null;

  const { accounts, creditCards, investments } = await getDashboardData(
    session.user.id
  );

  const totalAccounts = accounts.reduce((sum, acc) => {
    const balance = acc.transactions.reduce((s, t) => s + t.amount.toNumber(), 0);
    return sum + acc.openingBalance.toNumber() + balance;
  }, 0);

  const totalInvestments = investments.reduce((sum, inv) => {
    const balance = inv.transactions.reduce((s, t) => {
      if (t.type === "APORTE" || t.type === "RENDIMENTO") return s + t.amount.toNumber();
      if (t.type === "RESGATE" || t.type === "TAXA") return s - t.amount.toNumber();
      return s;
    }, 0);
    return sum + inv.openingBalance.toNumber() + balance;
  }, 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/dashboard/importar"
            className="rounded bg-slate-900 px-4 py-2 text-white"
          >
            Importar extrato
          </Link>
          <Link
            href="/dashboard/agenda"
            className="rounded border border-slate-300 px-4 py-2"
          >
            Agenda
          </Link>
          <Link
            href="/dashboard/cartoes"
            className="rounded border border-slate-300 px-4 py-2"
          >
            Cartões
          </Link>
          <Link
            href="/dashboard/contas"
            className="rounded border border-slate-300 px-4 py-2"
          >
            Contas
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Contas</h2>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {brl(totalAccounts)}
          </p>
          {accounts.map((account) => {
            const balance = account.transactions.reduce(
              (s, t) => s + t.amount.toNumber(),
              0
            );
            return (
              <Link
                key={account.id}
                href={`/dashboard/contas/${account.id}`}
                className="mt-4 block rounded border border-slate-100 p-3 hover:border-slate-300"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{account.name}</span>
                  <span>{brl(account.openingBalance.toNumber() + balance)}</span>
                </div>
                <p className="text-xs text-slate-500">
                  Saldo inicial {brl(account.openingBalance)}
                </p>
              </Link>
            );
          })}
          {accounts.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              Nenhuma conta cadastrada.{" "}
              <Link href="/dashboard/contas" className="text-slate-900 underline">
                Adicionar
              </Link>
            </p>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">
            Cartões de crédito
          </h2>
          {creditCards.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Nenhum cartão cadastrado.</p>
          ) : (
            creditCards.map((card) => {
              const open = card.statements
                .filter((s) => !s.paid)
                .reduce((s, st) => s + st.total.toNumber(), 0);
              return (
                <div
                  key={card.id}
                  className="mt-4 rounded border border-slate-100 p-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{card.name}</span>
                    <span>{brl(open)}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Vencimento dia {card.dueDay} · Fechamento dia {card.closingDay}
                  </p>
                </div>
              );
            })
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-medium text-slate-500">Investimentos</h2>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {brl(totalInvestments)}
          </p>
          {investments.map((inv) => {
            const balance = inv.transactions.reduce((s, t) => {
              if (t.type === "APORTE" || t.type === "RENDIMENTO")
                return s + t.amount.toNumber();
              if (t.type === "RESGATE" || t.type === "TAXA")
                return s - t.amount.toNumber();
              return s;
            }, 0);
            return (
              <div
                key={inv.id}
                className="mt-4 flex items-center justify-between rounded border border-slate-100 p-3"
              >
                <div>
                  <span className="font-medium">{inv.name}</span>
                  <p className="text-xs text-slate-500">{inv.institution}</p>
                </div>
                <span>{brl(inv.openingBalance.toNumber() + balance)}</span>
              </div>
            );
          })}
          {investments.length === 0 && (
            <p className="mt-4 text-sm text-slate-500">
              Nenhum investimento cadastrado.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
