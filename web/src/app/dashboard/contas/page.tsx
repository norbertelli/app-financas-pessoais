import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createAccount, deleteAccount } from "@/lib/actions/accounts";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);

export default async function AccountsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [accounts, banks] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.user.id },
      include: {
        bank: true,
        transactions: {
          where: { status: { not: "EXCLUIDA" } },
          select: { amount: true },
        },
      },
      orderBy: { order: "asc" },
    }),
    prisma.bank.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contas</h1>
        <Link
          href="/dashboard"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Voltar
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          {accounts.map((account) => {
            const balance = account.transactions.reduce(
              (s, t) => s + t.amount.toNumber(),
              0
            );
            return (
              <div
                key={account.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <Link href={`/dashboard/contas/${account.id}`}>
                  <p className="font-medium">{account.name}</p>
                  <p className="text-xs text-slate-500">
                    {account.bank?.name ?? "Sem banco"}
                    {account.agency ? ` · Ag ${account.agency}` : ""}
                    {account.number ? ` · Conta ${account.number}` : ""}
                  </p>
                </Link>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">
                    {brl(account.openingBalance.toNumber() + balance)}
                  </p>
                  <form action={deleteAccount.bind(null, account.id)}>
                    <button
                      type="submit"
                      className="text-sm text-red-500 hover:text-red-700"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
          {accounts.length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma conta ainda.</p>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Nova conta</h2>
          <form action={createAccount} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Nome</label>
              <input
                name="name"
                required
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Banco</label>
              <select
                name="bankCode"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              >
                <option value="">Sem banco</option>
                {banks.map((bank) => (
                  <option key={bank.id} value={bank.code}>
                    {bank.code} - {bank.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Agência</label>
                <input
                  name="agency"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Conta</label>
                <input
                  name="number"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium">
                Saldo inicial (R$)
              </label>
              <input
                name="openingBalance"
                inputMode="decimal"
                defaultValue="0,00"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <button className="w-full rounded bg-slate-900 px-4 py-2 text-white">
              Adicionar
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
