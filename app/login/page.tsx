"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (tab === "register") {
      if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres."); return; }
      if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }
    }
    setLoading(true);
    const res = await signIn("credentials", { email, password, mode: tab, callbackUrl, redirect: false });
    setLoading(false);
    if (res?.error) {
      if (tab === "login") setError("Email o contraseña incorrectos.");
      else setError("Este email ya tiene una cuenta. Inicia sesión.");
    } else if (res?.url) {
      router.push(res.url);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-6xl">🥗</p>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">NutriSnap</h1>
          <p className="text-gray-500 dark:text-zinc-400 text-sm">Registra tu comida con inteligencia artificial</p>
        </div>

        <button
          onClick={() => signIn("google", { callbackUrl }, { prompt: "select_account" })}
          className="w-full flex items-center justify-center gap-3 bg-white text-zinc-900 font-semibold py-3.5 rounded-xl hover:bg-zinc-100 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
          <span className="text-gray-400 dark:text-zinc-600 text-xs">o con email</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
        </div>

        <div className="flex bg-gray-100 dark:bg-zinc-900 rounded-xl p-1">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "login" ? "bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white" : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"}`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "register" ? "bg-gray-200 dark:bg-zinc-700 text-gray-900 dark:text-white" : "text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300"}`}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <input
            type="email"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
          {tab === "register" && (
            <input
              type="password"
              placeholder="Confirmar contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
              className="w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          )}
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {loading ? "..." : tab === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        </form>

        <p className="text-gray-400 dark:text-zinc-600 text-xs">Tus datos son privados y solo tú puedes verlos.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
