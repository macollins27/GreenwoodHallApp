"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "Unable to sign in.");
      }
      router.push("/admin");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to sign in."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-card">
        <h1 className="text-2xl font-semibold text-primary">
          Greenwood Hall Admin
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to manage bookings and blocked dates.
        </p>
        {error && (
          <div className="mt-4 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-semibold text-textMain">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-semibold text-textMain">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded-2xl border border-primary/20 px-4 py-3 text-sm shadow-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}

