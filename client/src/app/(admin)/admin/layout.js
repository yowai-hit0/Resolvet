// app/(admin)/layout.js
"use client";

import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useUIStore } from "@/store/ui";

export default function AdminLayout({ children }) {
  const { sidebarOpen } = useUIStore();
  
  return (
    <RequireAuth role="admin">
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar title="Admin Dashboard" />
        <div className="flex flex-1 relative">
          <Sidebar role="admin" />
          {/* Overlay for mobile sidebar */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-40 sm:hidden"
              onClick={() => useUIStore.getState().setSidebarOpen(false)}
            />
          )}
          <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-[1600px] w-full mx-auto transition-all duration-200">
            {children}
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}