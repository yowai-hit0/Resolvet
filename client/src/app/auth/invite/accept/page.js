"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { InvitesAPI } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function AcceptInvitePage() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const { setToken, setUser } = useAuthStore();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid invitation link. Please check your email for the correct link.");
      setLoading(false);
      setTokenValid(false);
    } else {
      setTokenValid(true);
      setLoading(false);
    }
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!token) {
      setError("Missing invitation token. Please use the link from your email.");
      return;
    }

    if (!name || name.trim().length < 2) {
      setError("Please enter your full name (at least 2 characters).");
      return;
    }

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await InvitesAPI.accept({ token, name: name.trim(), password });
      const data = res?.data || res;
      const user = data?.user || data?.data?.user;
      const jwt = data?.token || data?.data?.token;
      
      if (jwt) setToken(jwt);
      if (user) setUser(user);
      
      const role = user?.role;
      if (role === 'super_admin' || role === 'admin') {
        router.replace('/admin');
      } else if (role === 'agent') {
        router.replace('/agent');
      } else {
        router.replace('/');
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to accept invite. Please try again.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-foreground/70">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="card-body text-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">Invalid Invitation</h1>
                <p className="text-sm text-muted-foreground">
                  {error || "This invitation link is invalid or has expired."}
                </p>
              </div>
              <div className="pt-4">
                <a href="/login" className="btn btn-primary">
                  Go to Login
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="card-body space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Welcome to Resolvet</h1>
              <p className="text-sm text-muted-foreground">
                Complete your account setup to accept the invitation
              </p>
            </div>

            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium text-foreground">
                  Full Name *
                </label>
                <input
                  id="name"
                  type="text"
                  className="input w-full"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Enter your full name"
                  required
                  minLength={2}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  This will be used to identify you in the system
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password *
                </label>
                <input
                  id="password"
                  type="password"
                  className="input w-full"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Create a secure password"
                  required
                  minLength={8}
                  disabled={submitting}
                />
                <p className="text-xs text-muted-foreground">
                  Must be at least 8 characters long
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                  Confirm Password *
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input w-full"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="Confirm your password"
                  required
                  minLength={8}
                  disabled={submitting}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !name || !password || !confirmPassword}
                className="btn btn-primary w-full"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    Creating account...
                  </>
                ) : (
                  "Create Account & Continue"
                )}
              </button>
            </form>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-center text-muted-foreground">
                Already have an account?{" "}
                <a href="/login" className="text-primary hover:underline">
                  Sign in
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


