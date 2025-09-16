import Link from "next/link";
import { useUIStore } from "@/store/ui";

export default function Sidebar({ role }) {
  const { sidebarOpen, setSidebarOpen } = useUIStore();
  const adminLinks = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/tickets", label: "Tickets" },
    { href: "/admin/analytics", label: "Analytics" },
    { href: "/admin/tags", label: "Tags" },
    { href: "/admin/users", label: "Users" },
  ];
  const agentLinks = [
    { href: "/agent", label: "Dashboard" },
    { href: "/agent/tickets", label: "My Tickets" },
  ];
  const links = role === "admin" ? adminLinks : agentLinks;
  return (
    <aside className={`border-r p-3 space-y-1 bg-background fixed sm:static inset-y-0 left-0 z-50 transform transition-transform w-56 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}`}>
      <button className="btn sm:hidden mb-2" onClick={() => setSidebarOpen(false)}>Close</button>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="block px-2 py-1 rounded hover:bg-black/5">
          {l.label}
        </Link>
      ))}
    </aside>
  );
}


