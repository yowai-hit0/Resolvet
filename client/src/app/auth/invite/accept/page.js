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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!token) return setError("Missing token");
    setSubmitting(true);
    setError("");
    try {
      const res = await InvitesAPI.accept({ token, name, password });
      const data = res?.data || res;
      const user = data?.user || data?.data?.user;
      const jwt = data?.token || data?.data?.token;
      if (jwt) setToken(jwt);
      if (user) setUser(user);
      const role = user?.role;
      if (role === 'super_admin' || role === 'admin') router.replace('/admin');
      else if (role === 'agent') router.replace('/agent');
      else router.replace('/');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to accept invite';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50/50 to-white">
      <div className="w-full max-w-md border border-gray-200 rounded-lg bg-white shadow-sm">
        <div className="p-6 pb-0 text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Resolvet</h1>
          <p className="text-gray-600 text-sm">Complete your account to accept the invitation</p>
        </div>
        <div className="p-6">
          {error ? <div className="p-3 bg-red-100 border border-red-200 rounded-lg text-red-700 text-sm mb-3">{error}</div> : null}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Full name</label>
              <input className="input" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Jane Doe" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Password</label>
              <input type="password" className="input" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <button disabled={submitting} type="submit" className="login-button">
              {submitting ? 'Creating account...' : 'Create account and continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


