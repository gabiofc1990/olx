import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ShieldCheck, ShoppingCart, Tag, Mic, Send, X, Trash2, Pause, Play } from "lucide-react";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { supabase } from "@/integrations/supabase/client";
import { getSelectedItem, setReturnTo, type SelectedItem } from "@/lib/selected";

export const Route = createFileRoute("/chat")({
  component: ChatPage,
  validateSearch: (s: Record<string, unknown>) => ({
    listingId: typeof s.listingId === "string" ? s.listingId : undefined,
  }),
});

type Msg = {
  id: string;
  sender: "visitor" | "seller";
  content: string;
  created_at: string;
  read_at: string | null;
};

type ChatItem = Required<Pick<SelectedItem, "title" | "sellerName" | "priceCents" | "image">> & Pick<SelectedItem, "listingId" | "sellerSales" | "sourcePath">;

const VISITOR_KEY = "olx_visitor_id";
const SESSION_PREFIX = "olx_chat_session_";

function getVisitorId() {
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) { v = crypto.randomUUID(); localStorage.setItem(VISITOR_KEY, v); }
  return v;
}

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseOfferInput(s: string) {
  const cleaned = s.replace(/[^\d,]/g, "");
  const [intP, decP = ""] = cleaned.split(",");
  return parseInt(intP || "0", 10) * 100 + parseInt((decP + "00").slice(0, 2), 10);
}

async function resolveItem(listingId?: string): Promise<ChatItem | null> {
  const selected = getSelectedItem();
  if (selected && (!listingId || selected.listingId === listingId)) return selected as ChatItem;
  if (!listingId) return selected as ChatItem | null;

  const { data: listing } = await supabase
    .from("listings")
    .select("id, slug, title, price_cents, seller_name, seller_sales")
    .eq("id", listingId)
    .eq("published", true)
    .maybeSingle();
  if (!listing) return null;
  const { data: imgs } = await supabase
    .from("listing_images")
    .select("url")
    .eq("listing_id", listingId)
    .order("display_order")
    .limit(1);

  return {
    listingId: listing.id,
    title: listing.title,
    sellerName: listing.seller_name ?? "Jonatan",
    priceCents: listing.price_cents ?? 0,
    image: imgs?.[0]?.url ?? "",
    sellerSales: listing.seller_sales ?? undefined,
    sourcePath: listing.slug ? `/anuncio/${listing.slug}` : undefined,
  };
}

function ChatPage() {
  const navigate = useNavigate();
  const { listingId } = useSearch({ from: "/chat" });

  const [authed, setAuthed] = useState(false);
  const [item, setItem] = useState<ChatItem | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerValue, setOfferValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Recording
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recIntRef = useRef<number | null>(null);

  // Auth gate
  useEffect(() => {
    const fakeAuthed = (() => { try { return localStorage.getItem("olx_fake_auth") === "1"; } catch { return false; } })();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session && !fakeAuthed) {
        setReturnTo("/chat" + (listingId ? `?listingId=${listingId}` : ""));
        navigate({ to: "/login" });
        return;
      }
      setAuthed(true);
    });
  }, [navigate, listingId]);

  // Load product snapshot
  useEffect(() => {
    let cancelled = false;
    setItem(null);
    resolveItem(listingId).then((next) => {
      if (!cancelled) setItem(next);
    });
    return () => { cancelled = true; };
  }, [listingId]);

  const sellerName = item?.sellerName ?? "Jonatan";

  // Session init
  useEffect(() => {
    if (!authed || !item) return;
    (async () => {
      const visitor = getVisitorId();
      const activeListingId = listingId ?? item.listingId ?? "general";
      const key = SESSION_PREFIX + activeListingId;
      let sid = localStorage.getItem(key);
      if (sid) {
        const { data } = await supabase.from("chat_sessions").select("id").eq("id", sid).maybeSingle();
        if (!data) sid = null;
      }
      if (!sid) {
        const { data: { user } } = await supabase.auth.getUser();
        const meta: any = user?.user_metadata ?? {};
        const name = meta.full_name || user?.email?.split("@")[0] || "Comprador";
        const { data, error } = await supabase
          .from("chat_sessions")
          .insert({ visitor_id: visitor, listing_id: activeListingId === "general" ? null : activeListingId, visitor_name: name })
          .select("id").single();
        if (error || !data) return;
        sid = data.id;
        localStorage.setItem(key, sid);
        const greeting = `Olá! Tenho interesse no seu anúncio "${item.title}". Ainda está disponível?`;
        await supabase.from("chat_messages").insert({ session_id: sid, sender: "visitor", content: greeting });
        await supabase.from("chat_sessions").update({ last_message_at: new Date().toISOString() }).eq("id", sid);
      }
      setSessionId(sid);
      const { data: msgs } = await supabase
        .from("chat_messages").select("*").eq("session_id", sid).order("created_at");
      setMessages((msgs ?? []) as Msg[]);
    })();
  }, [authed, listingId, item]);

  // Realtime
  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase
      .channel(`chat-page-${sessionId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (p) => setMessages((prev) => prev.some((m) => m.id === (p.new as any).id) ? prev : [...prev, p.new as Msg]))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (p) => { const m = p.new as Msg; setMessages((prev) => prev.map((x) => x.id === m.id ? { ...x, read_at: m.read_at } : x)); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [sessionId]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Mark seller messages read
  useEffect(() => {
    if (!sessionId) return;
    const ids = messages.filter((m) => m.sender === "seller" && !m.read_at).map((m) => m.id);
    if (ids.length > 0) {
      supabase.from("chat_messages").update({ read_at: new Date().toISOString() }).in("id", ids).then(() => {});
    }
  }, [messages, sessionId]);

  const sendText = async (content: string) => {
    if (!content.trim() || !sessionId) return;
    await supabase.from("chat_messages").insert({ session_id: sessionId, sender: "visitor", content });
    await supabase.from("chat_sessions").update({ last_message_at: new Date().toISOString() }).eq("id", sessionId);
  };

  const handleSendInput = async () => {
    const v = input.trim();
    if (!v) return;
    setInput("");
    await sendText(v);
  };

  const handleSendOffer = async () => {
    const cents = parseOfferInput(offerValue);
    if (cents <= 0 || !sessionId) return;
    await sendText(`[offer]${cents}`);
    setOfferOpen(false);
    setOfferValue("");
  };

  const startRecord = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const filename = `${crypto.randomUUID()}.webm`;
        const path = `${sessionId ?? "anon"}/${filename}`;
        const { error } = await supabase.storage.from("chat-audio").upload(path, blob, { contentType: "audio/webm" });
        if (!error && sessionId) {
          const { data } = supabase.storage.from("chat-audio").getPublicUrl(path);
          await sendText(`[audio]${data.publicUrl}`);
        }
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      recIntRef.current = window.setInterval(() => setRecSeconds((s) => s + 1), 1000);
    } catch {
      alert("Permita o acesso ao microfone para gravar áudio.");
    }
  };

  const stopRecord = (cancel = false) => {
    if (recIntRef.current) { clearInterval(recIntRef.current); recIntRef.current = null; }
    setRecording(false);
    if (cancel) {
      chunksRef.current = [];
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
      try { mediaRef.current?.stop(); } catch {}
      // discard: clear chunks before onstop fires
      const mr = mediaRef.current;
      if (mr) { mr.onstop = () => mr.stream.getTracks().forEach((t) => t.stop()); }
      return;
    }
    try { mediaRef.current?.stop(); } catch {}
  };

  if (!authed) return null;
  if (!item) {
    return (
      <div className="bg-white min-h-screen font-sans text-[#1c1c1c] flex flex-col max-w-md mx-auto">
        <div className="bg-white border-b border-gray-200 px-3 py-3 flex items-center gap-3 sticky top-0 z-30">
          <button onClick={() => navigate({ to: "/" })} className="p-1 -ml-1 text-gray-800"><ArrowLeft size={22} /></button>
          <p className="font-bold text-[17px]">Chat</p>
        </div>
        <div className="flex-1 grid place-items-center px-6 text-center text-sm text-gray-500">
          Não encontramos esse anúncio. Volte ao item e abra o chat novamente.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen font-sans text-[#1c1c1c] flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-3 py-3 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={() => { let back = item.sourcePath ?? "/"; try { back = sessionStorage.getItem("olx_chat_back") || item.sourcePath || "/"; } catch {} window.location.href = back; }} className="p-1 -ml-1 text-gray-800"><ArrowLeft size={22} /></button>
        <p className="font-bold text-[17px] flex items-center gap-1.5">
          {sellerName}
          <VerifiedBadge size={18} />
        </p>
      </div>

      {/* Product strip */}
      <div className="px-3 py-3 flex items-center gap-3 border-b border-gray-100">
        <img src={item.image} alt={item.title} className="w-12 h-12 rounded object-cover bg-gray-100" />
        <div className="min-w-0">
          <p className="text-[15px] text-gray-700 truncate">{item.title}</p>
          <p className="text-[15px] text-gray-700">{formatBRL(item.priceCents)}</p>
        </div>
      </div>

      {/* Warning */}
      <div className="bg-[#1c1c1c] text-white text-[13px] leading-snug px-4 py-3 flex gap-2">
        <ShieldCheck size={18} className="shrink-0 mt-0.5 text-white" />
        <p>A OLX não solicita seus dados ou envia links por este chat. Ao suspeitar de algo, denuncie.</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-white">
        <p className="text-center text-[13px] text-[#f28100] font-medium">Hoje</p>

        {/* Profile card */}
        <div className="border border-gray-200 rounded-xl p-3 max-w-[280px] mx-auto shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#a855f7] to-[#ec4899] grid place-items-center text-white text-[10px] font-bold">Foto</div>
            <div>
              <p className="text-[10px] font-bold text-[#f28100] tracking-wide flex items-center gap-1">
                PERFIL VERIFICADO <VerifiedBadge size={12} />
              </p>
              <p className="font-bold text-[15px] -mt-0.5">{sellerName}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1">
            <Stat icon={<CalendarIcon />} value="3 anos" label="Na OLX" />
            <Stat icon={<PicIcon />} value="1" label="Anúncios publicados" />
            <Stat icon={<CheckBoxIcon />} value={String(item.sellerSales ?? 0)} label="Vendas concluídas" />
          </div>
        </div>

        {/* System bubble */}
        <div className="bg-[#e9f6ff] border border-[#d3edff] rounded-xl p-3 max-w-[280px] mx-auto">
          <div className="flex gap-2 text-[#0a6aa8]">
            <ShieldCheck size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] leading-snug">Não envie informações de contato para vendedores para ter mais segurança.</p>
              <p className="text-[13px] font-bold mt-1">Comprando na OLX com segurança</p>
            </div>
          </div>
          <p className="text-right text-[11px] text-gray-400 mt-1">{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>

        {/* Conversation */}
        {messages.map((m) => <Bubble key={m.id} msg={m} sellerName={sellerName} />)}
      </div>

      {/* Action buttons */}
      <div className="px-3 pt-2 pb-1 flex gap-2 bg-white">
        <button
          onClick={() => navigate({ to: "/entrega" })}
          className="flex items-center gap-1.5 bg-[#f28100] text-white font-bold px-4 py-2 rounded-full text-[14px] shadow-sm"
        >
          <ShoppingCart size={16} /> Comprar
        </button>
        <button
          onClick={() => setOfferOpen(true)}
          className="flex items-center gap-1.5 bg-[#fde7d6] text-[#a14a00] font-bold px-4 py-2 rounded-full text-[14px]"
        >
          <Tag size={16} /> Fazer oferta
        </button>
      </div>

      {/* Input bar */}
      <div className="px-3 py-3 bg-white border-t border-gray-100 sticky bottom-0">
        {recording ? (
          <div className="flex items-center gap-3 bg-[#fff5eb] border border-[#f28100] rounded-full px-4 py-2.5">
            <button onClick={() => stopRecord(true)} className="text-red-600"><Trash2 size={18} /></button>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm flex-1 text-gray-700">Gravando… {String(Math.floor(recSeconds / 60)).padStart(2, "0")}:{String(recSeconds % 60).padStart(2, "0")}</span>
            <button onClick={() => stopRecord(false)} className="w-9 h-9 rounded-full bg-[#f28100] text-white grid place-items-center"><Send size={16} /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 border border-gray-300 rounded-full pl-4 pr-1 py-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendInput(); } }}
              placeholder={`Responder ${sellerName}`}
              className="flex-1 bg-transparent outline-none text-[15px] py-2"
            />
            {input.trim() ? (
              <button onClick={handleSendInput} className="w-9 h-9 rounded-full bg-[#f28100] text-white grid place-items-center"><Send size={16} /></button>
            ) : (
              <button onClick={startRecord} className="w-9 h-9 rounded-full text-gray-600 grid place-items-center"><Mic size={20} /></button>
            )}
          </div>
        )}
      </div>

      {/* Offer drawer */}
      {offerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end" onClick={() => setOfferOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md mx-auto bg-white rounded-t-2xl p-5 animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[18px] font-bold">Fazer oferta de preço</h3>
              <button onClick={() => setOfferOpen(false)} className="text-gray-500"><X size={22} /></button>
            </div>
            <p className="text-[14px] text-gray-600 mb-5 leading-snug">
              Envie uma oferta de preço que deseja pagar. Se o vendedor concordar, o preço será editado só para você que fez a oferta.
            </p>
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <p className="text-[13px] text-gray-600 mb-1">Preço original</p>
                <div className="bg-gray-100 rounded-lg px-3 py-2.5 text-[15px] text-gray-700">
                  {formatBRL(item.priceCents).replace("R$", "R$ ")}
                </div>
              </div>
              <div>
                <p className="text-[13px] text-gray-600 mb-1">Sua oferta</p>
                <input
                  autoFocus
                  inputMode="numeric"
                  value={offerValue}
                  onChange={(e) => setOfferValue(e.target.value)}
                  placeholder="R$ 0,00"
                  className="w-full border-2 border-[#6e0ad6] rounded-lg px-3 py-2.5 text-[15px] text-[#6e0ad6] font-medium outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleSendOffer}
              disabled={parseOfferInput(offerValue) <= 0}
              className="w-full bg-[#6e0ad6] disabled:bg-gray-200 disabled:text-gray-500 text-white font-bold py-3 rounded-full text-[15px]"
            >
              Enviar oferta
            </button>
            <button onClick={() => setOfferOpen(false)} className="w-full text-[#6e0ad6] font-bold py-3 mt-1 text-[15px]">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="grid place-items-center mb-1 text-[#f28100]">{icon}</div>
      <p className="text-[13px] font-bold leading-tight">{value}</p>
      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
    </div>
  );
}

function CalendarIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function PicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-5-5L5 21" />
    </svg>
  );
}
function CheckBoxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="m9 12 2 2 4-4" />
    </svg>
  );
}

function Bubble({ msg, sellerName }: { msg: Msg; sellerName: string }) {
  const isVisitor = msg.sender === "visitor";
  const time = new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let body: React.ReactNode;
  if (msg.content.startsWith("[audio]")) {
    const url = msg.content.slice(7);
    body = <AudioPlayer url={url} dark={isVisitor} />;
  } else if (msg.content.startsWith("[video]")) {
    const url = msg.content.slice(7);
    body = <video src={url} controls className="rounded-lg max-w-[260px] max-h-[340px] bg-black" />;
  } else if (msg.content.startsWith("[offer]")) {
    const cents = parseInt(msg.content.slice(7), 10) || 0;
    body = (
      <div className="flex items-center gap-2">
        <Tag size={16} />
        <span>Oferta enviada: <b>{formatBRL(cents)}</b></span>
      </div>
    );
  } else {
    body = <p className="whitespace-pre-wrap break-words">{msg.content}</p>;
  }

  return (
    <div className={`flex ${isVisitor ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] px-3.5 py-2 rounded-2xl text-[14px] leading-snug shadow-sm ${
        isVisitor ? "bg-[#f28100] text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"
      }`}>
        {!isVisitor && <p className="text-[10px] font-bold text-[#6e0ad6] mb-0.5">{sellerName}</p>}
        {body}
        <p className={`text-[10px] mt-1 flex justify-end items-center gap-1 ${isVisitor ? "text-white/80" : "text-gray-400"}`}>
          {time}
          {isVisitor && <span>{msg.read_at ? "✓✓" : "✓"}</span>}
        </p>
      </div>
    </div>
  );
}

function AudioPlayer({ url, dark }: { url: string; dark: boolean }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const a = ref.current; if (!a) return;
    if (a.paused) { a.play(); setPlaying(true); } else { a.pause(); setPlaying(false); }
  };
  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <button onClick={toggle} className={`w-8 h-8 rounded-full grid place-items-center ${dark ? "bg-white/20" : "bg-[#f28100]/20 text-[#f28100]"}`}>
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className={`flex-1 h-1 rounded-full ${dark ? "bg-white/40" : "bg-gray-300"}`} />
      <audio ref={ref} src={url} onEnded={() => setPlaying(false)} preload="none" />
    </div>
  );
}
