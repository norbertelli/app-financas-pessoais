import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { createCard, deleteCard, updateCard } from "@/lib/actions/cards";

const brl = (n: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);

export default async function CardsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const [cards, banks] = await Promise.all([
    prisma.creditCard.findMany({
      where: { userId: session.user.id },
      include: { bank: true, statements: true },
      orderBy: { name: "asc" },
    }),
    prisma.bank.findMany({ orderBy: { code: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Cartões de crédito</h1>
        <div className="flex gap-2 text-sm">
          <Link
            href="/dashboard"
            className="rounded border border-slate-300 px-3 py-1.5"
          >
            ← Voltar
          </Link>
          <a
            href="#nova"
            className="rounded bg-slate-900 px-3 py-1.5 text-white"
          >
            + Novo cartão
          </a>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          {cards.map((card) => {
            const open = card.statements
              .filter((s) => !s.paid)
              .reduce((s, st) => s + st.total.toNumber(), 0);
            return (
              <details
                key={card.id}
                className="group rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <summary className="flex cursor-pointer items-center justify-between p-4">
                  <div>
                    <Link
                      href={`/dashboard/cartoes/${card.id}`}
                      className="font-medium hover:underline"
                    >
                      {card.name}
                    </Link>
                    {card.lastDigits && (
                      <span className="ml-2 text-sm text-slate-400">
                        •••• {card.lastDigits}
                      </span>
                    )}
                    <p className="text-xs text-slate-500">
                      {card.bank
                        ? `${card.bank.code} - ${card.bank.name} · `
                        : ""}
                      Fecha dia {card.closingDay} · Vence dia {card.dueDay}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{brl(open)}</p>
                    <p className="text-xs text-slate-400">
                      melhor compra: dia {card.bestPurchaseDay}
                    </p>
                    <Link
                      href={`/dashboard/cartoes/${card.id}#importar`}
                      className="mt-1 inline-block rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700"
                    >
                      Importar extrato
                    </Link>
                  </div>
                </summary>

                <div className="border-t border-slate-100 p-4">
                  {card.limit ? (
                    <p className="mb-3 text-sm text-slate-600">
                      Limite: <strong>{brl(card.limit.toNumber())}</strong>
                    </p>
                  ) : null}
                  <form action={updateCard} className="grid grid-cols-2 gap-3">
                    <input type="hidden" name="id" value={card.id} />
                    <div>
                      <label className="block text-xs font-medium">Nome</label>
                      <input
                        name="name"
                        defaultValue={card.name}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">
                        Final do cartão
                      </label>
                      <input
                        name="lastDigits"
                        defaultValue={card.lastDigits ?? ""}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">
                        Fechamento
                      </label>
                      <input
                        name="closingDay"
                        type="number"
                        min={1}
                        max={31}
                        defaultValue={card.closingDay}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">
                        Vencimento
                      </label>
                      <input
                        name="dueDay"
                        type="number"
                        min={1}
                        max={31}
                        defaultValue={card.dueDay}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium">
                        Limite (R$)
                      </label>
                      <input
                        name="limit"
                        inputMode="decimal"
                        defaultValue={card.limit ? card.limit.toString() : ""}
                        className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <button className="rounded bg-slate-900 px-3 py-1.5 text-white">
                        Salvar
                      </button>
                      <button
                        formAction={deleteCard.bind(null, card.id)}
                        className="rounded border border-red-200 px-3 py-1.5 text-red-600"
                      >
                        Excluir
                      </button>
                    </div>
                  </form>
                  <p className="mt-3 text-xs text-slate-500">
                    Melhor dia de compra calculado: <strong>dia {card.bestPurchaseDay}</strong> (um dia após o fechamento, maximiza o prazo até o vencimento).
                  </p>
                </div>
              </details>
            );
          })}
          {cards.length === 0 && (
            <p className="text-sm text-slate-500">Nenhum cartão cadastrado.</p>
          )}
        </section>

        <section
          id="nova"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold">Novo cartão</h2>
          <form action={createCard} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Nome</label>
              <input
                name="name"
                required
                placeholder="Ex.: Cartão Itaú"
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
                {banks.map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">
                  Final do cartão
                </label>
                <input
                  name="lastDigits"
                  maxLength={4}
                  placeholder="1234"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Limite (R$)</label>
                <input
                  name="limit"
                  inputMode="decimal"
                  placeholder="0,00"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium">Fechamento</label>
                <input
                  name="closingDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue="5"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Vencimento</label>
                <input
                  name="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue="15"
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="flex items-end pb-1">
                <p className="text-xs text-slate-500">
                  Melhor dia de compra será{" "}
                  <strong>{/* preenchido automaticamente */}automático</strong>
                </p>
              </div>
            </div>
            <button className="w-full rounded bg-slate-900 px-4 py-2 text-white">
              Adicionar cartão
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}