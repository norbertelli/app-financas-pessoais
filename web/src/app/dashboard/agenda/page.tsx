import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createBill } from "@/lib/actions/bills";
import { PayForm } from "@/components/bills-form";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);

const fmtDate = (d: Date) => d.toLocaleDateString("pt-BR");

export default async function BillsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [bills, accounts] = await Promise.all([
    prisma.bill.findMany({
      where: { userId: session.user.id, status: { not: "CANCELADA" } },
      include: { paidBank: true, paidAccount: true },
      orderBy: [{ paidAt: "asc" }, { dueDate: "asc" }],
    }),
    prisma.account.findMany({
      where: { userId: session.user.id },
      include: { bank: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const pendingTotal = bills
    .filter((b) => b.status === "PENDENTE")
    .reduce((s, b) => s + b.amount.toNumber(), 0);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Agenda de contas a pagar</h1>
        <Link
          href="/dashboard"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          ← Voltar
        </Link>
      </div>

      {bills.filter((b) => b.status === "PENDENTE").length > 0 && (
        <p className="rounded bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Total a pagar: <strong>{brl(pendingTotal)}</strong>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Pendentes</h2>
          {bills
            .filter((b) => b.status === "PENDENTE")
            .map((bill) => {
              const overdue = bill.dueDate < new Date();
              return (
                <div
                  key={bill.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-medium">{bill.name}</p>
                    <p
                      className={`text-xs ${overdue ? "text-red-600" : "text-slate-500"}`}
                    >
                      Vence {fmtDate(bill.dueDate)}
                      {overdue ? " · Atrasada" : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-semibold">{brl(bill.amount.toNumber())}</p>
                    <PayForm
                      bill={{ id: bill.id, name: bill.name }}
                      accounts={accounts}
                    />
                  </div>
                </div>
              );
            })}
          {bills.filter((b) => b.status === "PENDENTE").length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma conta pendente.</p>
          )}

          <h2 className="pt-4 text-lg font-semibold">Pagas</h2>
          {bills
            .filter((b) => b.status === "PAGO")
            .map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-slate-600">{bill.name}</p>
                  <p className="text-xs text-slate-500">
                    Vencimento {fmtDate(bill.dueDate)} · Paga em{" "}
                    {bill.paidAt ? fmtDate(bill.paidAt) : "—"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {bill.paidAccount
                      ? `Debitada de ${bill.paidAccount.name}` +
                        (bill.paidAccount.agency
                          ? ` (Ag ${bill.paidAccount.agency}`
                          : "") +
                        (bill.paidAccount.number
                          ? `, Conta ${bill.paidAccount.number}`
                          : "") +
                        (bill.paidAccount.agency ? ")" : "")
                      : "sem conta vinculada"}
                    {bill.paidBank ? ` · Banco ${bill.paidBank.code}` : ""}
                  </p>
                </div>
                <p className="font-semibold text-green-600">
                  {brl(bill.amount.toNumber())}
                </p>
              </div>
            ))}
          {bills.filter((b) => b.status === "PAGO").length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma conta paga ainda.</p>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Nova conta a pagar</h2>
          <form action={createBill} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Descrição</label>
              <input
                name="name"
                required
                placeholder="Ex.: Aluguel, Energia, Internet"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">
                  Vencimento
                </label>
                <input
                  name="dueDate"
                  type="date"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Valor (R$)</label>
                <input
                  name="amount"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
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