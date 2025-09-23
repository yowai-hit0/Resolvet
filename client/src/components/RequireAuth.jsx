"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function RequireAuth({ children, role }) {
  const router = useRouter();
  const { user, loading, bootstrap } = useAuthStore();

  useEffect(() => {
    // try to load session on first mount
    if (!user && !loading) {
      bootstrap();
    }
  }, [user, loading, bootstrap]);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (role && user.role && user.role !== role) {
        // super_admin can access admin
        if (role === 'admin' && user.role === 'super_admin') return;
        router.replace(user.role === "admin" || user.role === 'super_admin' ? "/admin" : "/agent");
      }
    }
  }, [user, loading, role, router]);

  if (loading || !user) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center text-sm text-foreground/70">
        Loading...
      </div>
    );
  }

  return children;
}


