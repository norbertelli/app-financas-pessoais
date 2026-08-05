"use client";

import { useState } from "react";
import type { CardImportRow } from "@/lib/actions/card-import";
import { importCardTransactions } from "@/lib/actions/card-import";

export function CardImportForm({ cardId }: { cardId: string }) {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<CardImportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleParse() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("/api/parse/card", {
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
        `${data.transactions.length} lançamentos detectados (incluindo parcelas futuras).`
      );
    } catch {
      setMessage("Erro ao chamar o serviço.");
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    if (rows.length === 0) return;
    setLoading(true);
    const result = await importCardTransactions(cardId, rows);
    setLoading(false);
    setMessage(
      result?.error ??
        `Importados ${result?.rows} lançamentos nas faturas (corrente + futuras).`
    );
    setRows([]);
    setText("");
  }

  const months = Array.from(new Set(rows.map((r) => r.competence))).sort();

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={"COMPRA PARCELADA 3X 05/08/2026 249,90\nMERCADO 04/08/2026 120,00\n..."}
        className="mt-1 w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
      />
      <button
        onClick={handleParse}
        disabled={loading || !text.trim()}
        className="rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Analisando..." : "Analisar"}
      </button>

      {message && <p className="text-sm text-slate-600">{message}</p>}

      {rows.length > 0 && (
        <section>
          <p className="mb-2 text-sm font-medium">
            {months.join(" · ")} (parcelas futuras criadas automaticamente)
          </p>
          <div className="max-h-72 overflow-auto rounded border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2">Competência</th>
                  <th className="px-3 py-2">Data</th>
                  <th className="px-3 py-2">Valor</th>
                  <th className="px-3 py-2">Descrição</th>
                  <th className="px-3 py-2">Parc.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2">{row.competence}</td>
                    <td className="px-3 py-2">{row.date.slice(0, 10)}</td>
                    <td className="px-3 py-2">
                      {row.amount.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </td>
                    <td className="px-3 py-2">{row.description}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {row.installments > 1
                        ? `${row.installmentCurrent}/${row.installments}`
                        : "—"}
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
            Importar nas faturas
          </button>
        </section>
      )}
    </div>
  );
}