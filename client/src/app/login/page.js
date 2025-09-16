"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error, user } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Redirect after login based on role
  useEffect(() => {
    if (user?.role) {
      router.replace(user.role === "admin" ? "/admin" : "/agent");
    }
  }, [user, router]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      const result = await login(email, password);
      const role = result?.user?.role;
      router.replace(role === "admin" ? "/admin" : "/agent");
    } catch {}
  };

  if (user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 border rounded p-6">
        <div className="text-center">
          <div className="text-2xl font-bold">Resolvet</div>
          <div className="text-sm opacity-70">Sign in</div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            className="w-full border rounded px-3 py-2 text-black"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input
            className="w-full border rounded px-3 py-2 text-black"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-black text-white py-2 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <div className="text-sm text-center">
          Don't have an account? <a href="/register" className="underline">Sign up</a>
        </div>
      </form>
    </div>
  );
}


