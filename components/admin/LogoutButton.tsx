"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogout() {
    setIsLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className="rounded-full border border-white/50 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-70"
    >
      {isLoading ? "Logging out..." : "Logout"}
    </button>
  );
}

