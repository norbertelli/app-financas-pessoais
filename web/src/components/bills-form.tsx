"use client";

import { useState } from "react";
import { payBill, cancelBill, deleteBill } from "@/lib/actions/bills";

type Account = {
  id: string;
  name: string;
  number: string | null;
  bank: { id: string; code: string; name: string } | null;
};

export function PayForm({
  bill,
  accounts,
}: {
  bill: { id: string; name: string };
  accounts: Account[];
}) {
  const [open, setOpen] = useState(false);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const [paidDate, setPaidDate] = useState(today);

  const selected = accounts.find((a) => a.id === accountId);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded bg-green-600 px-3 py-1.5 text-sm text-white"
      >
        Pagar
      </button>
      <form action={cancelBill.bind(null, bill.id)}>
        <button
          type="submit"
          className="rounded border border-slate-300 px-3 py-1.5 text-sm"
        >
          Cancelar
        </button>
      </form>
      <form action={deleteBill.bind(null, bill.id)}>
        <button
          type="submit"
          className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600"
        >
          Excluir
        </button>
      </form>

      {open && (
        <form
          action={payBill}
          className="w-72 rounded border border-green-200 bg-green-50 p-3 text-sm"
        >
          <input type="hidden" name="id" value={bill.id} />
          <p className="mb-2 font-medium">Quitar &quot;{bill.name}&quot;</p>

          <label className="block text-xs font-medium">Data do pagamento</label>
          <input
            type="date"
            name="paidDate"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
          />

          <label className="mt-2 block text-xs font-medium">
            Conta debitada
          </label>
          <select
            name="accountId"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
          >
            <option value="">Sem conta vinculada</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bank ? `${a.bank.code} - ` : ""}
                {a.name}
                {a.number ? ` (${a.number})` : ""}
              </option>
            ))}
          </select>

          {selected?.bank && (
            <p className="mt-2 rounded bg-white px-2 py-1 text-xs text-slate-600">
              Banco {selected.bank.code} - {selected.bank.name}
              {selected.number ? ` · conta ${selected.number}` : ""}
            </p>
          )}

          <button
            type="submit"
            className="mt-2 w-full rounded bg-green-700 px-3 py-1.5 text-white"
          >
            Confirmar pagamento
          </button>
        </form>
      )}
    </div>
  );
}