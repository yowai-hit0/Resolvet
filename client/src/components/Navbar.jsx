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
    <div className="flex items-center justify-between px-4 py-3 border-b bg-background sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <button className="btn inline-flex sm:hidden" onClick={toggleSidebar} aria-label="Toggle menu">☰</button>
        <div className="font-semibold">{title || "Resolvet"}</div>
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <span className="text-sm opacity-80">{user.email}</span>
            <button
              onClick={onLogout}
              className="text-sm border rounded px-3 py-1 hover:bg-black hover:text-white"
            >
              Logout
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


