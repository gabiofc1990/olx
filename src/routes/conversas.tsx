import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Search, Check, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setSelectedItem } from "@/lib/selected";

export const Route = createFileRoute("/conversas")({ component: ConversasPage });

const VISITOR_KEY = "olx_visitor_id";

type Conv = {
  id: string;
  listing_id: string | null;
  last_message_at: string;
  listing_title: string;
  seller_name: string;
  thumb: string | null;
  slug: string | null;
  price_cents: number;
  last_message: string;
  unread: number;
};

function timeAgo(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;
  if (diffH < 1) {
    const m = Math.max(1, Math.floor(diffMs / 60000));
    return `${m}min`;
  }
  if (diffH < 24 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  const yest = new Date(now); yest.setDate(now.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return "Ontem";
  if (diffH < 24 * 7) return d.toLocaleDateString("pt-BR", { weekday: "short" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ConversasPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"todas" | "vendendo" | "comprando">("todas");
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const visitor = typeof window !== "undefined" ? localStorage.getItem(VISITOR_KEY) : null;
    if (!visitor) { setLoading(false); return; }

    (async () => {
      const { data: sessions } = await supabase
        .from("chat_sessions")
        .select("id, listing_id, last_message_at")
        .eq("visitor_id", visitor)
        .order("last_message_at", { ascending: false })
        .limit(50);

      if (!sessions || sessions.length === 0) { setLoading(false); return; }

      const listingIds = Array.from(new Set(sessions.map(s => s.listing_id).filter(Boolean))) as string[];
      const sessionIds = sessions.map(s => s.id);

      const [{ data: listings }, { data: imgs }, { data: lastMsgs }] = await Promise.all([
        listingIds.length
          ? supabase.from("listings").select("id, title, slug, seller_name, price_cents").in("id", listingIds)
          : Promise.resolve({ data: [] as any[] }),
        listingIds.length
          ? supabase.from("listing_images").select("listing_id, url").in("listing_id", listingIds).order("display_order")
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("chat_messages").select("session_id, content, sender, read_at, created_at").in("session_id", sessionIds).order("created_at", { ascending: false }),
      ]);

      const listingMap = new Map((listings ?? []).map((l: any) => [l.id, l]));
      const thumbMap = new Map<string, string>();
      (imgs ?? []).forEach((i: any) => { if (!thumbMap.has(i.listing_id)) thumbMap.set(i.listing_id, i.url); });
      const lastMsgMap = new Map<string, any>();
      const unreadMap = new Map<string, number>();
      (lastMsgs ?? []).forEach((m: any) => {
        if (!lastMsgMap.has(m.session_id)) lastMsgMap.set(m.session_id, m);
        if (m.sender === "seller" && !m.read_at) unreadMap.set(m.session_id, (unreadMap.get(m.session_id) ?? 0) + 1);
      });

      const list: Conv[] = sessions.map((s: any) => {
        const l = s.listing_id ? listingMap.get(s.listing_id) : null;
        const lm = lastMsgMap.get(s.id);
        return {
          id: s.id,
          listing_id: s.listing_id,
          last_message_at: s.last_message_at,
          listing_title: l?.title ?? "Anúncio",
          seller_name: l?.seller_name ?? "Vendedor",
          thumb: s.listing_id ? thumbMap.get(s.listing_id) ?? null : null,
          slug: l?.slug ?? null,
          price_cents: l?.price_cents ?? 0,
          last_message: lm?.content?.startsWith("audio:") ? "🎤 Áudio" : (lm?.content ?? "Iniciar conversa"),
          unread: unreadMap.get(s.id) ?? 0,
        };
      });

      setConvs(list);
      setLoading(false);
    })();
  }, []);

  const openConv = (c: Conv) => {
    if (c.thumb) {
      setSelectedItem({
        title: c.listing_title,
        sellerName: c.seller_name,
        priceCents: c.price_cents,
        image: c.thumb,
      });
    }
    navigate({ to: "/chat", search: c.listing_id ? { listingId: c.listing_id } : {} });
  };

  return (
    <div className="bg-white min-h-screen max-w-md mx-auto pb-20">
      {/* Top bar with logo + bell */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-gray-100 sticky top-0 bg-white z-30">
        <div className="flex items-center gap-0.5 font-black text-2xl tracking-tighter">
          <span className="text-[#6e0ad6] leading-none">o</span>
          <span className="text-[#91eb33] leading-none">l</span>
          <span className="text-[#f28100] leading-none">x</span>
        </div>
        <button aria-label="Notificações" className="relative text-[#1c1c1c]">
          <Bell size={22} />
          {convs.some(c => c.unread > 0) && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#e62117] rounded-full ring-2 ring-white" />
          )}
        </button>
      </header>

      {/* Title row */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#1c1c1c]">Chat</h1>
        <div className="flex items-center gap-3">
          <button aria-label="Buscar" className="text-[#1c1c1c]"><Search size={20} /></button>
          <div className="w-7 h-7 bg-gray-200 rounded" />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 flex items-center gap-2 pb-3 border-b border-gray-100">
        {([
          ["todas", "Todas"],
          ["vendendo", "Vendendo"],
          ["comprando", "Comprando"],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition ${
              tab === k
                ? "bg-[#f4f0fe] text-[#6e0ad6] border-[#6e0ad6]"
                : "bg-white text-[#1c1c1c] border-gray-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#6e0ad6] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : convs.length === 0 ? (
        <div className="py-20 px-6 flex flex-col items-center text-center text-gray-500">
          <div className="w-16 h-16 rounded-full bg-[#f4f0fe] grid place-items-center mb-4">
            <MessageSquare size={28} className="text-[#6e0ad6]" />
          </div>
          <p className="text-[15px] font-bold text-[#1c1c1c]">Nenhuma conversa ainda</p>
          <p className="text-[13px] mt-1 max-w-xs">
            Entre em um anúncio e clique em "Chat" para começar a conversar com o vendedor.
          </p>
          <Link to="/" className="mt-5 bg-[#f28100] text-white font-bold px-6 py-2.5 rounded-full text-[14px]">
            Ver anúncios
          </Link>
        </div>
      ) : (
        <ul>
          {convs.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => openConv(c)}
                className="w-full px-4 py-3 flex items-start gap-3 hover:bg-gray-50 active:bg-gray-100 text-left border-b border-gray-50"
              >
                <div className="relative shrink-0">
                  {c.thumb ? (
                    <img src={c.thumb} alt="" className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-gray-100" />
                  )}
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 rounded-full bg-white border border-gray-200 grid place-items-center text-[11px] font-bold text-gray-700">
                    {(c.seller_name || "A").slice(0, 1).toUpperCase()}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] text-gray-500 leading-tight truncate">{c.listing_title}</p>
                  <p className="text-[14px] font-bold text-[#1c1c1c] leading-tight flex items-center gap-1 truncate">
                    {c.seller_name}
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#1da1f2] text-white shrink-0">
                      <Check size={9} strokeWidth={4} />
                    </span>
                  </p>
                  <p className={`text-[13px] leading-tight mt-0.5 truncate ${c.unread > 0 ? "text-[#1c1c1c] font-semibold" : "text-gray-500"}`}>
                    {c.last_message}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-gray-500">{timeAgo(c.last_message_at)}</span>
                  {c.unread > 0 && (
                    <span className="bg-[#6e0ad6] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center">
                      {c.unread}
                    </span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      
    </div>
  );
}
