"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function RedirectIfAuth({ children }) {
  const router = useRouter();
  const { user, token, loading, bootstrap } = useAuthStore();

  useEffect(() => {
    // try to hydrate session if token exists but no user
    if (token && !user && !loading) {
      bootstrap();
    }
  }, [token, user, loading, bootstrap]);

  useEffect(() => {
    if (!loading && user?.role) {
      if (user.role === "admin") {
        router.replace("/admin");
      } else if (user.role === "agent") {
        router.replace("/agent");
      }
    }
  }, [user, loading, router]);

  // While checking bootstrap or redirecting → show nothing
  if (loading) return null;

  return children;
}
