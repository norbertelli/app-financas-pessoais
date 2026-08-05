"use client";

import { useState } from "react";
import type { ParsedTransaction } from "@/lib/ml";
import { importTransactions } from "@/lib/actions/import";

type Account = { id: string; name: string };

export function ImportForm({ accounts }: { accounts: Account[] }) {
  const [text, setText] = useState("");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [period, setPeriod] = useState("");
  const [rows, setRows] = useState<ParsedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleParse() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Erro ao analisar.");
        return;
      }
      setRows(data.transactions);
      setMessage(
        `Analisadas ${data.transactions.length} transações. Revise antes de importar.`
      );
    } catch {
      setMessage("Erro de rede ao chamar o serviço de análise.");
    } finally {
      setLoading(false);
    }
  }

  function updateRow(i: number, patch: Partial<ParsedTransaction>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function handleImport() {
    if (!accountId || rows.length === 0) return;
    setLoading(true);
    const result = await importTransactions(
      accountId,
      period || new Date().toISOString().slice(0, 7),
      rows
    );
    setLoading(false);
    setMessage(
      result?.error ??
        `Importadas ${result?.imported} transações (${result?.statementId ? "extrato criado" : ""}).`
    );
    setRows([]);
    setText("");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium">Conta</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Período (AAAA-MM)</label>
          <input
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            placeholder={new Date().toISOString().slice(0, 7)}
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium">
          Colar texto do extrato
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder={"PIX RECEBIDO                  05/08 100,00\nMERCADO PAGO                   04/08 250,43\n..."}
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
        />
        <button
          onClick={handleParse}
          disabled={loading || !text.trim()}
          className="mt-2 rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Analisando..." : "Analisar"}
        </button>
      </div>

      {message && <p className="text-sm text-slate-600">{message}</p>}

      {rows.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Prévia</h2>
          <div className="max-h-96 overflow-auto rounded border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <input
                        value={row.date}
                        onChange={(e) => updateRow(i, { date: e.target.value })}
                        className="w-28 rounded border border-slate-200 px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        value={row.amount}
                        onChange={(e) =>
                          updateRow(i, { amount: Number(e.target.value) })
                        }
                        className="w-28 rounded border border-slate-200 px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={row.description}
                        onChange={(e) =>
                          updateRow(i, { description: e.target.value })
                        }
                        className="w-full rounded border border-slate-200 px-2 py-1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={handleImport}
            disabled={loading}
            className="mt-4 rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
          >
            Importar {rows.length} transações
          </button>
        </section>
      )}
    </div>
  );
}
