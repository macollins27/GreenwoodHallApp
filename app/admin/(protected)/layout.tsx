import { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/admin/LogoutButton";
import { ADMIN_COOKIE_NAME } from "@/lib/auth";

export default async function AdminProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const isAuthed = Boolean(cookieStore.get(ADMIN_COOKIE_NAME));
  if (!isAuthed) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-primary text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-primaryLight">
              Admin
            </p>
            <h1 className="text-xl font-semibold">Greenwood Hall Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="rounded-full border border-white/30 px-4 py-2 text-sm font-semibold transition hover:bg-white/20"
            >
              View Site
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}

