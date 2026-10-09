"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await authClient.signOut();
        router.push("/");
        router.refresh();
      }}
      className="h-10 rounded-xl border border-stone-300 px-3 text-sm font-medium active:bg-stone-100"
    >
      Salir
    </button>
  );
}
