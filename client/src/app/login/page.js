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

  // Clear error when form inputs change
  useEffect(() => {
    if (error) {
      useAuthStore.getState().error = undefined;
    }
  }, [email, password]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || loginInProgress) return;
    
    try {
      const result = await login(email, password);
      if (result?.user) {
        setIsRedirecting(true);
        const role = result.user.role;
        router.replace(role === "admin" ? "/admin" : "/agent");
      }
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  if (user && !isRedirecting) return null;

  return (
    <RedirectIfAuth> 
      <div className="login-container">
        <div className="login-card">
          <div className="card-body">
            <div className="login-header">
              <h1 className="login-title">Resolvet</h1>
              <p className="login-subtitle">Sign in to your account</p>
            </div>

            {error && (
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

            <div className="login-footer">
              Don't have an account?{" "}
              <a href="/register" className="login-link">
                Sign up
              </a>
            </div>
          </div>
        </div>
      </div>
    </RedirectIfAuth> 
  );
}