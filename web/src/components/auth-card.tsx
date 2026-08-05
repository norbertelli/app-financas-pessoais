"use client";

import { useState } from "react";
import { LoginForm, RegisterForm } from "@/components/auth-forms";

export function AuthCard() {
  const [mode, setMode] = useState<"login" | "register">("login");

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-center text-xl font-bold text-slate-900">
          {mode === "login" ? "Entrar" : "Criar conta"}
        </h1>

        <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm">
          <button
            onClick={() => setMode("login")}
            className={`rounded-md px-3 py-2 ${
              mode === "login"
                ? "bg-white font-medium text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            Entrar
          </button>
          <button
            onClick={() => setMode("register")}
            className={`rounded-md px-3 py-2 ${
              mode === "register"
                ? "bg-white font-medium text-slate-900 shadow-sm"
                : "text-slate-500"
            }`}
          >
            Cadastrar
          </button>
        </div>

        {mode === "login" ? <LoginForm /> : <RegisterForm />}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Controle financeiro pessoal
      </p>
    </div>
  );
}