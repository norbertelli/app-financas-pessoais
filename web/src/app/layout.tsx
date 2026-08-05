import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Finanças - Controle Financeiro",
  description: "Extratos, cartões de crédito e investimentos em um só lugar",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
              <Link href="/" className="text-lg font-bold text-slate-900">
              Finanças
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              {session?.user ? (
                <>
                  <span className="text-slate-600">{session.user.name}</span>
                  <form
                    action={async () => {
                      "use server";
                      const { signOut } = await import("@/lib/auth");
                      await signOut({ redirectTo: "/" });
                    }}
                  >
                    <button className="text-slate-500 hover:text-slate-900">
                      Sair
                    </button>
                  </form>
                </>
              ) : (
                <a href="/login" className="text-slate-600 hover:text-slate-900">
                  Entrar
                </a>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500">
          Finanças © {new Date().getFullYear()}
        </footer>
      </body>
    </html>
  );
}
