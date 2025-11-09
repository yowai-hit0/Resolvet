"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function RequireAuth({ children, role }) {
  const router = useRouter();
  const { user, loading, bootstrap, token } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      // Step 1: Check for token
      if (!token) {
        // No token found, redirect immediately
        if (mounted) {
          // Preserve attempted URL for post-login redirect
          const attemptedUrl = window.location.pathname + window.location.search;
          if (attemptedUrl !== "/login" && attemptedUrl !== "/register") {
            sessionStorage.setItem("redirect_after_login", attemptedUrl);
          }
          router.replace("/login");
        }
        return;
      }

      // Step 2: Token exists, validate it
      if (token && !user && !loading) {
        try {
          await bootstrap();
          if (mounted) {
            const updatedUser = useAuthStore.getState().user;
            if (!updatedUser) {
              // Token was invalid, bootstrap cleared it
              router.replace("/login");
              return;
            }
          }
        } catch (err) {
          // Bootstrap failed (token expired/invalid)
          if (mounted) {
            router.replace("/login");
          }
          return;
        }
      }

      if (mounted) {
        setChecking(false);
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [token, user, loading, bootstrap, router]);

  useEffect(() => {
    // Step 3: Role-based access control
    if (!loading && !checking && user) {
      if (role && user.role && user.role !== role) {
        // super_admin can access admin routes
        if (role === 'admin' && user.role === 'super_admin') {
          return;
        }
        // Redirect to appropriate dashboard based on role
        const targetRoute = user.role === "admin" || user.role === 'super_admin' ? "/admin" : "/agent";
        router.replace(targetRoute);
      }
    }
  }, [user, loading, checking, role, router]);

  // Show loading state while checking authentication
  if (checking || loading || !user) {
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


