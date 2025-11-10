"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { HealthAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

const AUTH_ROUTES = ["/login", "/register"];

function isAuthRoute(pathname) {
  if (!pathname) return false;
  if (AUTH_ROUTES.includes(pathname)) return true;
  return pathname.startsWith("/auth/");
}

function isProtectedRoute(pathname) {
  if (!pathname) return false;
  return pathname.startsWith("/admin") || pathname.startsWith("/agent");
}

function resolveHomeRoute(role) {
  if (role === "agent") return "/agent";
  return "/admin";
}

export function HealthGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, user, bootstrap, setToken } = useAuthStore();

  const [phase, setPhase] = useState("checking-health"); // checking-health | offline | auth-check | ready
  const [retryCount, setRetryCount] = useState(0);

  const redirectToLogin = useCallback(() => {
    if (typeof window !== "undefined") {
      const attemptedUrl = window.location.pathname + window.location.search;
      if (!isAuthRoute(attemptedUrl) && attemptedUrl !== "/") {
        sessionStorage.setItem("redirect_after_login", attemptedUrl);
      }
    }
    if (!isAuthRoute(pathname)) {
      router.replace("/login");
    }
  }, [pathname, router]);

  const handleRoleRedirect = useCallback((currentUser) => {
    if (!currentUser) return;
    if (isAuthRoute(pathname) || pathname === "/") {
      router.replace(resolveHomeRoute(currentUser.role));
    }
  }, [pathname, router]);

  useEffect(() => {
    let mounted = true;
    async function performHealthCheck() {
      try {
        await HealthAPI.check();
        if (mounted) {
          setPhase("auth-check");
        }
      } catch (error) {
        if (mounted) {
          setPhase("offline");
        }
      }
    }

    performHealthCheck();

    return () => {
      mounted = false;
    };
  }, [retryCount]);

  useEffect(() => {
    if (phase !== "auth-check" && phase !== "ready") {
      return;
    }

    if (phase === "auth-check") {
      if (!token) {
        redirectToLogin();
        setPhase("ready");
        return;
      }

      if (user?.role) {
        handleRoleRedirect(user);
        setPhase("ready");
        return;
      }

      let cancelled = false;

      (async () => {
        try {
          await bootstrap();
          if (cancelled) return;
          const updatedUser = useAuthStore.getState().user;
          if (updatedUser?.role) {
            handleRoleRedirect(updatedUser);
          } else {
            setToken(undefined);
            redirectToLogin();
          }
        } catch {
          if (!cancelled) {
            setToken(undefined);
            redirectToLogin();
          }
        } finally {
          if (!cancelled) {
            setPhase("ready");
          }
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    // phase === "ready"
    if (!token && isProtectedRoute(pathname)) {
      redirectToLogin();
    }
  }, [
    phase,
    token,
    user,
    bootstrap,
    pathname,
    redirectToLogin,
    handleRoleRedirect,
    setToken
  ]);

  const handleRetry = async () => {
    setPhase("checking-health");
    setRetryCount((prev) => prev + 1);
  };

  if (phase === "checking-health" || phase === "auth-check") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-foreground/70">
            {phase === "checking-health" ? "Connecting to server..." : "Verifying your session..."}
          </p>
        </div>
      </div>
    );
  }

  if (phase === "offline") {
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
