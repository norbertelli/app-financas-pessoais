import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { markStatementPaid } from "@/lib/actions/card-import";
import { CardImportForm } from "@/components/card-import-form";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) return null;

  const { id } = await params;

  const card = await prisma.creditCard.findFirst({
    where: { id, userId: session.user.id },
    include: {
      bank: true,
      statements: {
        include: {
          transactions: {
            orderBy: [{ installmentCurrent: "asc" }, { purchaseDate: "asc" }],
          },
        },
        orderBy: { competence: "desc" },
      },
    },
  });

  if (!card) notFound();

  const current = new Date().toISOString().slice(0, 7);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/cartoes"
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            ← Cartões
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{card.name}</h1>
          <p className="text-sm text-slate-500">
            {card.bank ? `${card.bank.code} - ${card.bank.name} · ` : ""}
            {card.lastDigits ? `•••• ${card.lastDigits} · ` : ""}
            Fecha dia {card.closingDay} · Vence dia {card.dueDay} · Melhor compra
            dia {card.bestPurchaseDay}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500">Limite</p>
          <p className="text-lg font-bold">
            {card.limit ? brl(card.limit.toNumber()) : "—"}
          </p>
        </div>
      </div>

      <section
        id="importar"
        className="scroll-mt-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-2 text-lg font-semibold">Importar fatura</h2>
        <p className="mb-3 text-xs text-slate-500">
          Colar texto do extrato. Compra &quot;3X&quot; ou &quot;parcela 2/10&quot;
          gera lançamentos na fatura corrente e nos meses futuros.
        </p>
        <CardImportForm cardId={card.id} />
      </section>

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">Faturas (extrato)</h2>

        {card.statements.length === 0 && (
          <p className="text-sm text-slate-500">
            Nenhuma fatura. Importe um extrato para conferência.
          </p>
        )}

        {card.statements.map((st) => {
          const isFuture = st.competence > current;
          const total = st.transactions.reduce(
            (s, t) => s + t.amount.toNumber(),
            0
          );
          return (
            <div
              key={st.id}
              className={`rounded-lg border bg-white shadow-sm ${
                st.paid
                  ? "border-green-200"
                  : isFuture
                    ? "border-dashed border-slate-300"
                    : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <div>
                  <p className="font-medium">
                    {fmtMonth(st.competence)}
                    {isFuture ? " · futura" : ""}
                    {st.paid ? " · paga" : ""}
                  </p>
                  <p className="text-xs text-slate-500">
                    {st.transactions.length} lançamentos
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold">{brl(total)}</p>
                  <form action={markStatementPaid.bind(null, st.id, !st.paid)}>
                    <button
                      className={`rounded px-3 py-1.5 text-sm ${
                        st.paid
                          ? "border border-slate-300"
                          : "bg-green-600 text-white"
                      }`}
                    >
                      {st.paid ? "Reabrir fatura" : "Marcar como paga"}
                    </button>
                  </form>
                </div>
              </div>

              <ul className="divide-y divide-slate-100">
                {st.transactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between px-4 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">{t.description}</p>
                      <p className="text-xs text-slate-500">
                        Compra {t.purchaseDate.toLocaleDateString("pt-BR")}
                        {t.installments > 1
                          ? ` · parcela ${t.installmentCurrent}/${t.installments}`
                          : ""}
                      </p>
                    </div>
                    <span className="font-medium">
                      {brl(t.amount.toNumber())}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function fmtMonth(comp: string) {
  const [y, m] = comp.split("-").map(Number);
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${months[m - 1]} / ${y}`;
}