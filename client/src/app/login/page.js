"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import RedirectIfAuth from "@/components/RedirectIfAuth";

export default function LoginPage() {
  const router = useRouter();
  const { login, loginInProgress, error, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Check for session expired message
  useEffect(() => {
    if (typeof window !== "undefined") {
      const expired = sessionStorage.getItem("session_expired");
      if (expired === "true") {
        setSessionExpired(true);
        sessionStorage.removeItem("session_expired");
      }
    }
  }, []);

  // Clear error when form inputs change
  useEffect(() => {
    if (error) {
      useAuthStore.getState().error = undefined;
    }
    // include error to satisfy exhaustive-deps; changes are safe
  }, [email, password, error]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || loginInProgress) return;
    
    try {
      const result = await login(email, password);
      if (result?.user) {
        setIsRedirecting(true);
        const role = result.user.role;
        
        // Check for preserved redirect URL
        const redirectUrl = typeof window !== "undefined" 
          ? sessionStorage.getItem("redirect_after_login") 
          : null;
        
        if (redirectUrl && redirectUrl !== "/login" && redirectUrl !== "/register") {
          sessionStorage.removeItem("redirect_after_login");
          router.replace(redirectUrl);
        } else {
          // Default role-based redirect
          router.replace((role === "admin" || role === 'super_admin') ? "/admin" : "/agent");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  if (user) return null;

  return (
    <RedirectIfAuth> 
      <div className="login-container">
        <div className="login-card">
          <div className="card-body">
            <div className="login-header">
              <h1 className="login-title">Resolvet</h1>
              <p className="login-subtitle">Sign in to your account</p>
            </div>

            {sessionExpired && (
              <div className="login-error">
                Session expired, please login again
              </div>
            )}
            {error && !sessionExpired && (
              <div className="login-error">
                {error.includes("401") ? "Invalid email or password" : error}
              </div>
            )}

            <form onSubmit={onSubmit} className="login-form">
              <div className="login-form-group">
                <label htmlFor="email" className="login-label">
                  Email
                </label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  disabled={loginInProgress || isRedirecting}
                />
              </div>

              <div className="login-form-group">
                <label htmlFor="password" className="login-label">
                  Password
                </label>
                <input
                  id="password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  disabled={loginInProgress || isRedirecting}
                />
              </div>

              <button
                type="submit"
                disabled={loginInProgress || isRedirecting}
                className="login-button"
              >
                {loginInProgress ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Signing in...
                  </>
                ) : isRedirecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Redirecting...
                  </>
                ) : (
                  "Sign in"
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </RedirectIfAuth> 
  );
}