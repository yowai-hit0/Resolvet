"use client";

import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }) {
  return (
    <RequireAuth role="admin">
      <div className="min-h-screen flex flex-col">
        <Navbar title="Admin" />
        <div className="flex flex-1">
          <Sidebar role="admin" />
          <main className="flex-1 p-4 max-w-[1400px] w-full mx-auto">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}


