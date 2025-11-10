"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function RedirectIfAuth({ children }) {
  const router = useRouter();
  const { user, token, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    if (!user?.role) return;

    if (user.role === "admin" || user.role === "super_admin") {
      router.replace("/admin");
    } else if (user.role === "agent") {
      router.replace("/agent");
    }
  }, [user, loading, router]);

  if (loading && token) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center text-sm text-foreground/70">Loading...</div>
    );
  }

  return children;
}
