"use client";

import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

export default function AgentLayout({ children }) {
  return (
    <RequireAuth role="agent">
      <div className="min-h-screen flex flex-col">
        <Navbar title="Agent" />
        <div className="flex flex-1">
          <Sidebar role="agent" />
          <main className="flex-1 p-4 max-w-[1400px] w-full mx-auto">{children}</main>
        </div>
      </div>
    </RequireAuth>
  );
}


