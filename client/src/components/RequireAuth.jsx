"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function RequireAuth({ children, role }) {
  const router = useRouter();
  const { user, loading, token } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    if (token) return;

    if (typeof window !== "undefined") {
      const attemptedUrl = window.location.pathname + window.location.search;
      if (attemptedUrl !== "/login" && attemptedUrl !== "/register") {
        sessionStorage.setItem("redirect_after_login", attemptedUrl);
      }
    }
    router.replace("/login");
  }, [token, loading, router]);

  useEffect(() => {
    if (loading || !user) return;
    if (!role) return;
    if (user.role === role) return;
    if (role === "admin" && user.role === "super_admin") return;

    const targetRoute = user.role === "admin" || user.role === "super_admin" ? "/admin" : "/agent";
    router.replace(targetRoute);
  }, [user, loading, role, router]);

  if (loading || !token || !user) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-foreground/70">Loading...</p>
        </div>
      </div>
    );
    }

  return children;
}


