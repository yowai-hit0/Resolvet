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
  const superAdminExtras = [
    { href: "/admin/invitations", label: "Invitations", icon: "✉️" },
  ];
  
  const agentLinks = [
    { href: "/agent", label: "Dashboard", icon: "📊" },
    { href: "/agent/tickets", label: "My Tickets", icon: "🎫" },
  ];
  
  const links = role === "admin" || role === "super_admin" 
    ? (role === "super_admin" ? [...adminLinks, ...superAdminExtras] : adminLinks)
    : agentLinks;

  return (
    <>
      {/* Sidebar - Fixed positioning */}
      <aside className={`
        bg-background border-r border-gray-300 fixed top-4 left-0 h-full z-40
        transform transition-transform duration-200 w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        shadow-lg md:shadow-none
      `}>
        {/* Only add top padding on desktop, not mobile */}
        <div className="h-full flex flex-col md:pt-16">
          <div className="p-4 border-b md:hidden">
            <div className="font-semibold text-lg">{(role === "admin" || role === "super_admin") ? "Admin Panel" : "Agent Panel"}</div>
          </div>
          
          <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
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
        </div>
      </aside>
    </>
  );
}