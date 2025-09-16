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
        router.replace(user.role === "admin" ? "/admin" : "/agent");
      }
    }
  }, [user, loading, role, router]);

  if (!user) {
    return null;
  }

  return children;
}


