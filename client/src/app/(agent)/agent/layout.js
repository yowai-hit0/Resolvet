// app/(agent)/layout.js
"use client";

import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { useUIStore } from "@/store/ui";

export default function AgentLayout({ children }) {
  const { sidebarOpen } = useUIStore();
  
  return (
    <RequireAuth role="agent">
      <div className="min-h-screen bg-background">
        {/* Navbar - fixed at top (highest z-index) */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <Navbar title="Agent" />
        </div>
        
        {/* Mobile overlay - below navbar but above content */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => useUIStore.getState().setSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar - fixed on left (above overlay) */}
        <Sidebar role="agent" />
        
        {/* Main content - positioned with padding for navbar and sidebar */}
        <div className="pt-16 md:pl-64 min-h-screen">
          <main className="p-4 max-w-[1400px] w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </RequireAuth>
  );
}