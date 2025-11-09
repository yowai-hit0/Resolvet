"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { HealthAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export function HealthGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, bootstrap } = useAuthStore();

  const [status, setStatus] = useState("checking"); // 'checking' | 'offline' | 'ready'
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function performHealthCheck() {
      try {
        // Step 1: Backend Health Check
        await HealthAPI.check();

        if (!mounted) return;

        // Backend is available, proceed to authentication check
        setStatus("ready");

        // Step 2: Authentication Status Check
        const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');
        const isProtected = pathname?.startsWith('/admin') || pathname?.startsWith('/agent');
        const isNeutral = pathname === '/' || pathname === '';

        // If no token found, redirect to login (unless already on auth page)
        if (!token) {
          if (!isAuthPage && !isProtected) {
            router.replace("/login");
          }
          return;
        }

        // If token exists, validate it
        if (token && !user) {
          try {
            await bootstrap();
            if (!mounted) return;
            // After bootstrap, user will be set or cleared
            const updatedUser = useAuthStore.getState().user;
            if (updatedUser?.role) {
              // User authenticated, handle role-based redirect
              if (isNeutral || isAuthPage) {
                if (updatedUser.role === "admin" || updatedUser.role === 'super_admin') {
                  router.replace("/admin");
                } else if (updatedUser.role === "agent") {
                  router.replace("/agent");
                }
              }
            }
          } catch (err) {
            if (!mounted) return;
            // Token invalid/expired, will be cleared by bootstrap
            if (!isAuthPage) {
              router.replace("/login");
            }
          }
        } else if (token && user?.role && (isNeutral || isAuthPage)) {
          // Already authenticated, redirect based on role
          if (user.role === "admin" || user.role === 'super_admin') {
            router.replace("/admin");
          } else if (user.role === "agent") {
            router.replace("/agent");
          }
        }
      } catch (error) {
        if (!mounted) return;
        // Backend unavailable
        setStatus("offline");
      }
    }

    performHealthCheck();

    return () => {
      mounted = false;
    };
  }, [pathname, router, token, user, bootstrap]);

  const handleRetry = async () => {
    setStatus("checking");
    setRetryCount(prev => prev + 1);
    // Trigger re-check
    try {
      await HealthAPI.check();
      setStatus("ready");
    } catch (error) {
      setStatus("offline");
    }
  };

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-foreground/70">Connecting to server...</p>
        </div>
      </div>
    );
  }

  if (status === "offline") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md px-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Service Unavailable</h1>
            <p className="text-sm text-foreground/70">
              Unable to connect to the server. Please check your connection and try again.
            </p>
          </div>
          <button
            onClick={handleRetry}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
          >
            Retry Connection
          </button>
          {retryCount > 0 && (
            <p className="text-xs text-foreground/50">
              Retry attempt {retryCount}
            </p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
