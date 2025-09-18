// components/Navbar.jsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useUIStore } from "@/store/ui";

export default function Navbar({ title }) {
  const { user, logout } = useAuthStore();
  const { toggleSidebar } = useUIStore();
  const router = useRouter();
  
  const onLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    } else {
      router.replace("/login");
    }
  };
  
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-background sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <button 
          className="btn btn-ghost p-2 md:hidden" 
          onClick={toggleSidebar} 
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="font-semibold text-lg">{title || "Resolvet"}</div>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm text-muted-foreground hidden sm:block">{user.email}</span>
            <button
              onClick={onLogout}
              className="btn btn-ghost text-sm"
            >
              <span className="hidden sm:inline">Logout</span>
              <svg className="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </>
        )}
        {!user && (
          <Link href="/login" className="text-sm underline">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}