import { useEffect, useRef, useState } from "react";
import { Send, MessageCircle, ArrowLeft, Circle, Zap, Plus, Trash2, X, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Session = {
  id: string;
  visitor_id: string;
  visitor_name: string | null;
  listing_id: string | null;
  created_at: string;
  last_message_at: string;
};
type Msg = { id: string; session_id: string; sender: "visitor" | "seller"; content: string; created_at: string; read_at: string | null };
type QuickReply = { id: string; label: string; content: string; display_order: number };

export function AdminChat({ listings }: { listings: { id: string; title: string }[] }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQRPanel, setShowQRPanel] = useState(false);
  const [newQRLabel, setNewQRLabel] = useState("");
  const [newQRContent, setNewQRContent] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const loadSessions = async () => {
    const { data } = await supabase
      .from("chat_sessions").select("*").order("last_message_at", { ascending: false });
    setSessions((data ?? []) as Session[]);
  };

  const loadMessages = async (sid: string) => {
    const { data } = await supabase
      .from("chat_messages").select("*").eq("session_id", sid).order("created_at");
    const msgs = (data ?? []) as Msg[];
    setMessages(msgs);
    setUnread((u) => ({ ...u, [sid]: 0 }));
    // Mark visitor messages as read
    const unreadIds = msgs.filter((m) => m.sender === "visitor" && !m.read_at).map((m) => m.id);
    if (unreadIds.length > 0) {
      await supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
    }
  };

  const loadQuickReplies = async () => {
    const { data } = await supabase
      .from("quick_replies").select("*").order("display_order").order("created_at");
    setQuickReplies((data ?? []) as QuickReply[]);
  };

  useEffect(() => { loadSessions(); loadQuickReplies(); }, []);

  // Realtime: all sessions + messages
  useEffect(() => {
    const ch = supabase
      .channel("admin-chat-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, () => loadSessions())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const m = payload.new as Msg;
        loadSessions();
        if (activeId === m.session_id) {
          setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
          if (m.sender === "visitor") {
            supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).eq("id", m.id).then(() => {});
          }
        } else if (m.sender === "visitor") {
          setUnread((u) => ({ ...u, [m.session_id]: (u[m.session_id] ?? 0) + 1 }));
          try {
            const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=");
            audio.play().catch(() => {});
          } catch {}
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, (payload) => {
        const m = payload.new as Msg;
        if (activeId === m.session_id) {
          setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, read_at: m.read_at } : x));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeId]);

  useEffect(() => {
    if (activeId) loadMessages(activeId);
    else setMessages([]);
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || !activeId) return;
    if (!text) setInput("");
    await supabase.from("chat_messages").insert({ session_id: activeId, sender: "seller", content });
    await supabase.from("chat_sessions").update({ last_message_at: new Date().toISOString() }).eq("id", activeId);
  };

  const sendVideo = async (file: File) => {
    if (!activeId || !file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("Vídeo muito grande. Limite: 50 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
      const path = `${activeId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("chat-media").upload(path, file, {
        contentType: file.type || "video/mp4",
      });
      if (error) { alert("Falha ao enviar vídeo: " + error.message); return; }
      const { data } = supabase.storage.from("chat-media").getPublicUrl(path);
      await supabase.from("chat_messages").insert({ session_id: activeId, sender: "seller", content: `[video]${data.publicUrl}` });
      await supabase.from("chat_sessions").update({ last_message_at: new Date().toISOString() }).eq("id", activeId);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addQuickReply = async () => {
    const label = newQRLabel.trim();
    const content = newQRContent.trim();
    if (!label || !content) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("quick_replies").insert({
      user_id: user.id, label, content, display_order: quickReplies.length,
    });
    setNewQRLabel(""); setNewQRContent("");
    loadQuickReplies();
  };

  const deleteQuickReply = async (id: string) => {
    await supabase.from("quick_replies").delete().eq("id", id);
    loadQuickReplies();
  };

  const active = sessions.find((s) => s.id === activeId) ?? null;
  const listingTitle = (id: string | null) => listings.find((l) => l.id === id)?.title ?? "Conversa geral";
  const totalUnread = Object.values(unread).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex h-[calc(100vh-220px)] min-h-[500px]">
      {/* List */}
      <div className={`${activeId ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 border-r border-slate-800`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">Conversas</h3>
            <p className="text-[11px] text-slate-500">{sessions.length} total{totalUnread > 0 && ` • ${totalUnread} novas`}</p>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-emerald-400">
            <Circle size={6} fill="currentColor" /> ao vivo
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          {sessions.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">
              <MessageCircle size={28} className="mx-auto mb-2 opacity-40" />
              Nenhuma conversa ainda.
            </div>
          )}
          {sessions.map((s) => {
            const u = unread[s.id] ?? 0;
            const isActive = activeId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-800 transition ${
                  isActive ? "bg-purple-500/15" : "hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-bold truncate ${isActive ? "text-purple-200" : "text-white"}`}>
                      {s.visitor_name || "Visitante"}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{listingTitle(s.listing_id)}</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {new Date(s.last_message_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {u > 0 && (
                    <span className="bg-pink-500 text-white text-[10px] font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">{u}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conversation */}
      <div className={`${activeId ? "flex" : "hidden md:flex"} flex-col flex-1 bg-slate-950`}>
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
            Selecione uma conversa para responder
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-slate-800 flex items-center gap-3">
              <button onClick={() => setActiveId(null)} className="md:hidden text-slate-400">
                <ArrowLeft size={20} />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-sm">
                {(active.visitor_name || "V").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm truncate">{active.visitor_name || "Visitante"}</p>
                <p className="text-[11px] text-slate-400 truncate">{listingTitle(active.listing_id)}</p>
              </div>
              <button
                onClick={() => setShowQRPanel(!showQRPanel)}
                className={`p-2 rounded-lg transition ${showQRPanel ? "bg-purple-600 text-white" : "text-slate-400 hover:bg-slate-800"}`}
                title="Respostas rápidas"
              >
                <Zap size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m) => {
                const isVideo = m.content.startsWith("[video]");
                const videoUrl = isVideo ? m.content.slice(7) : "";
                return (
                  <div key={m.id} className={`flex ${m.sender === "seller" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] px-3.5 py-2 rounded-2xl text-sm shadow ${
                      m.sender === "seller"
                        ? "bg-purple-600 text-white rounded-br-sm"
                        : "bg-slate-800 text-slate-100 rounded-bl-sm"
                    }`}>
                      {isVideo ? (
                        <video src={videoUrl} controls className="rounded-lg max-w-[260px] max-h-[320px] bg-black" />
                      ) : (
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      )}
                      <p className={`text-[10px] mt-1 flex items-center gap-1 ${m.sender === "seller" ? "text-purple-200 justify-end" : "text-slate-400"}`}>
                        {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        {m.sender === "seller" && (
                          <span className={m.read_at ? "text-cyan-300" : "text-purple-300/60"}>
                            {m.read_at ? "✓✓ Visto" : "✓✓"}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick replies bar */}
            {showQRPanel && (
              <div className="border-t border-slate-800 bg-slate-900 p-3 max-h-64 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">Respostas rápidas</p>
                  <button onClick={() => setShowQRPanel(false)} className="text-slate-500 hover:text-slate-300">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {quickReplies.length === 0 && (
                    <p className="text-[11px] text-slate-500 italic">Crie suas mensagens prontas abaixo.</p>
                  )}
                  {quickReplies.map((qr) => (
                    <div key={qr.id} className="group flex items-center gap-1 bg-slate-800 hover:bg-slate-700 rounded-full pl-3 pr-1 py-1">
                      <button onClick={() => send(qr.content)} className="text-xs text-slate-200" title={qr.content}>
                        {qr.label}
                      </button>
                      <button
                        onClick={() => deleteQuickReply(qr.id)}
                        className="text-slate-500 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newQRLabel}
                    onChange={(e) => setNewQRLabel(e.target.value)}
                    placeholder="Atalho (ex: Frete)"
                    className="w-32 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    value={newQRContent}
                    onChange={(e) => setNewQRContent(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addQuickReply()}
                    placeholder="Mensagem completa..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    onClick={addQuickReply}
                    disabled={!newQRLabel.trim() || !newQRContent.trim()}
                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg px-2.5 flex items-center"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            <div className="border-t border-slate-800 p-3 flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) sendVideo(f); }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                title="Enviar vídeo"
                className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center disabled:opacity-40 transition shrink-0"
              >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Video size={18} />}
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                rows={1}
                placeholder="Resposta para o cliente..."
                className="flex-1 resize-none bg-slate-900 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 max-h-24"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center disabled:opacity-40 transition shrink-0"
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
