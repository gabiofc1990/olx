import { Link, useLocation } from "@tanstack/react-router";
import { Home, MessageCircle } from "lucide-react";

const HIDE_PREFIXES = ["/login", "/entrega", "/checkout", "/admin", "/chat"];

export function BottomNav() {
  const { pathname } = useLocation();
  if (HIDE_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const isChat = pathname === "/conversas" || pathname === "/chat";
  const isHome = pathname === "/";

  const Item = ({
    to,
    icon: Icon,
    label,
    active,
    fill = false,
  }: {
    to: string;
    icon: any;
    label: string;
    active?: boolean;
    fill?: boolean;
  }) => (
    <Link
      to={to}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5"
    >
      <Icon
        size={22}
        className={active ? "text-[#6e0ad6]" : "text-[#1c1c1c]"}
        fill={active && fill ? "#6e0ad6" : "none"}
        strokeWidth={active ? 2.2 : 1.8}
      />
      <span
        className={`text-[11px] tracking-tight ${
          active ? "text-[#6e0ad6] font-semibold" : "text-[#1c1c1c]"
        }`}
      >
        {label}
      </span>
    </Link>
  );

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 bg-white border-t border-gray-200 flex items-stretch h-[60px]">
      <Item to="/" icon={Home} label="Início" active={isHome} fill />
      <Item to="/conversas" icon={MessageCircle} label="Chat" active={isChat} fill />
    </nav>
  );
}
