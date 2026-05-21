import { useEffect, useRef, useState } from "react";
import { X, Send, ShieldCheck, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Msg = { id: string; sender: "visitor" | "seller"; content: string; created_at: string; read_at: string | null };

const VISITOR_KEY = "olx_visitor_id";
const SESSION_KEY_PREFIX = "olx_chat_session_";

function getVisitorId() {
  if (typeof window === "undefined") return "";
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
}

export function ChatWidget({
  open, onClose, sellerName, listingId, listingTitle,
}: {
  open: boolean;
  onClose: () => void;
  sellerName: string;
  listingId?: string | null;
  listingTitle?: string;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [needsName, setNeedsName] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Init session when opened
  useEffect(() => {
    if (!open) return;
    (async () => {
      const visitor = getVisitorId();
      const key = SESSION_KEY_PREFIX + (listingId ?? "general");
      let sid = localStorage.getItem(key);

      // Verify session still exists
      if (sid) {
        const { data } = await supabase.from("chat_sessions").select("id,visitor_name").eq("id", sid).maybeSingle();
        if (!data) sid = null;
        else if (data.visitor_name) setVisitorName(data.visitor_name);
      }

      if (!sid) {
        setNeedsName(true);
      } else {
        setSessionId(sid);
        const { data: msgs } = await supabase
          .from("chat_messages").select("*").eq("session_id", sid).order("created_at");
        setMessages((msgs ?? []) as Msg[]);
      }

      // Try to prefill name from logged user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta: any = user.user_metadata ?? {};
        if (meta.full_name) setVisitorName(meta.full_name);
      }
      void visitor;
    })();
  }, [open, listingId]);

  // Realtime subscribe (inserts + read receipt updates)
  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase
      .channel(`chat-${sessionId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setMessages((prev) => {
            if (prev.some((m) => m.id === (payload.new as any).id)) return prev;
            return [...prev, payload.new as Msg];
          });
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, read_at: m.read_at } : x));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  // Mark seller messages as read when visible
  useEffect(() => {
    if (!sessionId || !open) return;
    const unreadIds = messages.filter((m) => m.sender === "seller" && !m.read_at).map((m) => m.id);
    if (unreadIds.length === 0) return;
    supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds).then(() => {});
  }, [messages, sessionId, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const startSession = async () => {
    const name = visitorName.trim();
    if (!name) return;
    const visitor = getVisitorId();
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ visitor_id: visitor, listing_id: listingId ?? null, visitor_name: name })
      .select("id").single();
    if (error || !data) return;
    const key = SESSION_KEY_PREFIX + (listingId ?? "general");
    localStorage.setItem(key, data.id);
    setSessionId(data.id);
    setNeedsName(false);

    // Auto greeting from seller
    await supabase.from("chat_messages").insert({
      session_id: data.id, sender: "visitor",
      content: `Olá! Tenho interesse${listingTitle ? ` em: ${listingTitle}` : ""}.`,
    });
  };

  const send = async () => {
    const content = input.trim();
    if (!content || !sessionId) return;
    setInput("");
    await supabase.from("chat_messages").insert({ session_id: sessionId, sender: "visitor", content });
    await supabase.from("chat_sessions").update({ last_message_at: new Date().toISOString() }).eq("id", sessionId);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col h-[85vh] sm:h-[600px] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#6e0ad6] to-[#8a1ff0] text-white px-4 py-3 flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
              {sellerName.charAt(0).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#6e0ad6]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[15px] leading-tight flex items-center gap-1">
              {sellerName} <ShieldCheck size={14} className="text-[#7fdcff]" fill="currentColor" />
            </p>
            <p className="text-[11px] text-white/80">Online agora • responde rápido</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full"><X size={20} /></button>
        </div>

        {/* Body */}
        {needsName ? (
          <div className="flex-1 flex flex-col justify-center px-6 py-8 bg-gray-50">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-[#6e0ad6]/10 flex items-center justify-center">
                <MessageCircle size={28} className="text-[#6e0ad6]" />
              </div>
            </div>
            <h3 className="text-center font-bold text-gray-900 text-lg leading-tight mb-1">Fale com {sellerName}</h3>
            <p className="text-center text-sm text-gray-500 mb-5">Como você se chama?</p>
            <input
              type="text"
              value={visitorName}
              onChange={(e) => setVisitorName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startSession()}
              placeholder="Seu nome"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#6e0ad6] mb-3"
              autoFocus
            />
            <button
              onClick={startSession}
              disabled={!visitorName.trim()}
              className="w-full bg-[#6e0ad6] hover:bg-[#5a08b3] text-white font-bold py-3 rounded-full transition disabled:opacity-50"
            >
              Iniciar conversa
            </button>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50 space-y-3">
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-center text-xs text-gray-500">
                Você está conversando com <span className="font-bold text-gray-900">{sellerName}</span>, vendedor verificado da OLX.
              </div>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "visitor" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3.5 py-2 rounded-2xl text-sm leading-snug shadow-sm ${
                    m.sender === "visitor"
                      ? "bg-[#6e0ad6] text-white rounded-br-sm"
                      : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                  }`}>
                    {m.sender === "seller" && <p className="text-[10px] font-bold text-[#6e0ad6] mb-0.5">{sellerName}</p>}
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p className={`text-[10px] mt-1 flex items-center gap-1 ${m.sender === "visitor" ? "text-white/70 justify-end" : "text-gray-400"}`}>
                      {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {m.sender === "visitor" && (
                        <span className={m.read_at ? "text-[#7fdcff]" : "text-white/50"}>
                          {m.read_at ? "✓✓ Visto" : "✓✓"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
              {messages.length === 0 && (
                <p className="text-center text-xs text-gray-400 py-4">Envie sua primeira mensagem.</p>
              )}
            </div>

            <div className="border-t border-gray-200 bg-white px-3 py-2.5 flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder="Digite sua mensagem..."
                className="flex-1 resize-none border border-gray-300 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#6e0ad6] max-h-24"
              />
              <button
                onClick={send}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-full bg-[#6e0ad6] text-white flex items-center justify-center disabled:opacity-40 hover:bg-[#5a08b3] transition shrink-0"
              >
                <Send size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
