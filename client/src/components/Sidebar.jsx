// components/Sidebar.jsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/store/ui";

export default function Sidebar({ role }) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const pathname = usePathname();
  
  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/tickets", label: "Tickets", icon: "🎫" },
    { href: "/admin/analytics", label: "Analytics", icon: "📈" },
    { href: "/admin/tags", label: "Tags", icon: "🏷️" },
    { href: "/admin/users", label: "Users", icon: "👥" },
  ];
  
  const agentLinks = [
    { href: "/agent", label: "Dashboard", icon: "📊" },
    { href: "/agent/tickets", label: "My Tickets", icon: "🎫" },
  ];
  
  const links = role === "admin" ? adminLinks : agentLinks;

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        bg-background border border-gray-300 fixed md:static inset-y-0 left-0 z-50 
        transform transition-transform duration-200 w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        shadow-lg md:shadow-none
      `}>
        <div className="p-4 border-b md:hidden">
          <div className="font-semibold text-lg">{role === "admin" ? "Admin Panel" : "Agent Panel"}</div>
        </div>
        
        <nav className="p-3 space-y-1">
          {links.map((l) => {
            const isActive = pathname === l.href;
            return (
              <Link 
                key={l.href} 
                href={l.href}
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                  ${isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-foreground hover:bg-accent'
                  }
                `}
                onClick={() => setSidebarOpen(false)}
              >
                <span>{l.icon}</span>
                <span>{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}