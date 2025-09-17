"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HealthAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export function HealthGate({ children }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  const [checking, setChecking] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function checkHealthAndAuth() {
      try {
        // 1. Check backend availability
        await HealthAPI.check();

        if (!mounted) return;

        // 2. Auth & role-based redirect
        if (token === undefined) {
          // not logged in yet → allow login page
          setChecking(false);
          return;
        }

        if (token && user?.role) {
          // logged in and role known
          if (user.role === "admin") {
            router.replace("/admin");
          } else if (user.role === "agent") {
            router.replace("/agent");
          } else {
            router.replace("/login");
          }
        } else if (!token) {
          router.replace("/login");
        }
      } catch (e) {
        if (mounted) setError("Backend unavailable");
      } finally {
        if (mounted) setChecking(false);
      }
    }

    checkHealthAndAuth();
    return () => {
      mounted = false;
    };
  }, [token, user?.role, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {error}
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Checking server health...
      </div>
    );
  }

  return <>{children}</>;
}
