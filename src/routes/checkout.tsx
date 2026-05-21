import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Shield, Truck, MapPin, CheckCircle2, Loader2, Copy, X } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { formatBRL } from "@/lib/listings";
import { getSelectedItem, getSelectedCep, setSelectedCep, consumeWelcome, type SelectedItem } from "@/lib/selected";
import pixLogo from "@/assets/pix-logo.png";
import { ExitPurchaseSheet } from "@/components/ExitPurchaseSheet";
import { PostLoginOverlay } from "@/components/PostLoginOverlay";
import { createPixCharge, checkPixStatus } from "@/lib/bspay.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({ component: CheckoutPage });

function LogoOLX() {
  return (
    <div className="flex items-end font-black text-2xl tracking-tighter leading-none">
      <span className="text-[#6e0ad6]">o</span>
      <span className="text-[#6e0ad6]">l</span>
      <span className="text-[#f28100]">x</span>
    </div>
  );
}

type Address = { logradouro: string; bairro: string; localidade: string; uf: string };

const FALLBACK: SelectedItem = {
  title: "iPhone 17 pro",
  sellerName: "Jonatan",
  priceCents: 675000,
  image: "https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=1000&auto=format&fit=crop",
};

function CheckoutPage() {
  const navigate = useNavigate();
  const goBackToListing = () => {
    const src = getSelectedItem()?.sourcePath;
    navigate({ to: (src && src.startsWith("/") ? src : "/") as string });
  };
  const [item, setItem] = useState<SelectedItem>(() => {
    if (typeof window === "undefined") return FALLBACK;
    return getSelectedItem() ?? FALLBACK;
  });

  const [cep, setCep] = useState("");
  const [addr, setAddr] = useState<Address | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepErr, setCepErr] = useState("");
  const [numero, setNumero] = useState("");
  const [referencia, setReferencia] = useState("");
  const [showExit, setShowExit] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const saved = getSelectedItem();
    if (saved) setItem(saved);
    const savedCep = getSelectedCep();
    if (savedCep) {
      setCep(savedCep);
      void handleCep(savedCep);
    }
    if (consumeWelcome()) setShowWelcome(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotal = item.priceCents;
  const total = subtotal;
  const listingId = typeof item.listingId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.listingId)
    ? item.listingId
    : undefined;

  const formatCep = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  const handleCep = async (raw: string) => {
    const f = formatCep(raw);
    setCep(f);
    setCepErr("");
    setAddr(null);
    const digits = f.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setSelectedCep(f);
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) { setCepErr("CEP não encontrado."); }
      else setAddr({ logradouro: data.logradouro, bairro: data.bairro, localidade: data.localidade, uf: data.uf });
    } catch {
      setCepErr("Não conseguimos validar o CEP. Tente novamente.");
    } finally {
      setCepLoading(false);
    }
  };

  const canContinue = useMemo(() => !!addr && numero.trim().length > 0, [addr, numero]);

  const createPix = useServerFn(createPixCharge);
  const checkPix = useServerFn(checkPixStatus);
  const [pixLoading, setPixLoading] = useState(false);
  const [pix, setPix] = useState<{ transactionId: string; qrcode: string; amountCents: number } | null>(null);
  const [pixStatus, setPixStatus] = useState<string>("PENDING");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => () => stopPolling(), []);

  const handleContinue = async () => {
    if (!canContinue || pixLoading) return;
    setPixLoading(true);
    try {
      const res = await createPix({
        data: {
          amountCents: total,
          listingId,
          description: item.title.slice(0, 120),
        },
      });
      setPix({ transactionId: res.transactionId, qrcode: res.qrcode, amountCents: res.amountCents });
      setPixStatus(res.status);
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const s = await checkPix({ data: { transactionId: res.transactionId } });
          setPixStatus(s.status);
          if (s.status === "PAID") {
            stopPolling();
            toast.success("Pagamento confirmado!");
          }
        } catch {}
      }, 4000);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível gerar o Pix. Tente novamente.");
    } finally {
      setPixLoading(false);
    }
  };

  const copyPix = async () => {
    if (!pix) return;
    try { await navigator.clipboard.writeText(pix.qrcode); toast.success("Código Pix copiado!"); }
    catch { toast.error("Não foi possível copiar."); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => setShowExit(true)} className="text-gray-700"><ChevronLeft size={24} /></button>
        <LogoOLX />
        <h1 className="text-base font-bold text-gray-900 ml-2">Resumo da compra</h1>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        <section className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-tight mb-3">Produto</h2>
          <div className="flex gap-3">
            <img src={item.image} alt={item.title} className="w-24 h-24 rounded-lg object-cover border border-gray-200" />
            <div className="flex-1">
              <p className="font-bold text-gray-900 text-sm leading-tight">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">Vendido por <span className="font-medium text-gray-700">{item.sellerName}</span></p>
              <p className="text-lg font-bold text-gray-900 mt-2">{formatBRL(subtotal)}</p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={20} className="text-[#6e0ad6]" />
            <h2 className="text-sm font-bold text-gray-900">Endereço de entrega</h2>
          </div>

          <label className="block">
            <span className="text-xs text-gray-600">CEP</span>
            <div className="relative mt-1">
              <input
                type="text"
                inputMode="numeric"
                value={cep}
                onChange={(e) => handleCep(e.target.value)}
                placeholder="00000-000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#6e0ad6] text-base"
              />
              {cepLoading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />}
            </div>
            <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer" className="text-[#6e0ad6] text-xs mt-1 inline-block">Não sei meu CEP</a>
          </label>

          {cepErr && <p className="mt-2 text-xs text-red-600">{cepErr}</p>}

          {addr && (
            <div className="mt-3 bg-[#f4f0fe] border border-[#dccbfa] rounded-lg p-3 text-sm text-gray-800">
              <p className="font-medium">{addr.logradouro || "—"}</p>
              <p className="text-xs text-gray-600">{addr.bairro} — {addr.localidade}/{addr.uf}</p>
            </div>
          )}

          {addr && (
            <div className="mt-3 grid grid-cols-1 gap-3">
              <label className="block">
                <span className="text-xs text-gray-600">Número *</span>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex: 123"
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#6e0ad6] text-base"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600">Referência (opcional)</span>
                <input
                  type="text"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Ex: ao lado do mercado"
                  className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#6e0ad6] text-base"
                />
              </label>
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg px-3 py-2 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-2">
            <Truck size={14} className="text-[#6e0ad6] shrink-0" />
            <p className="text-[11px] text-gray-700 leading-tight flex-1">
              <span className="font-semibold text-gray-900">Entrega Fácil</span> · em até <span className="font-semibold">24h</span>
            </p>
            <span className="text-[11px] font-bold text-[#2e8b57] whitespace-nowrap">Frete grátis</span>
          </div>
        </section>

        {addr && (
          <>
            <section className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-[#6e0ad6]/10 flex items-center justify-center shrink-0">
                  <Shield size={18} className="text-[#6e0ad6]" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">Garantia OLX · Compra Protegida</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Se o produto não chegar ou não for como descrito, você recebe <span className="font-semibold text-gray-800">100% do seu dinheiro de volta</span>.
                  </p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-tight mb-3">Forma de pagamento</h2>
              <div className="flex items-center gap-3 border-2 border-[#32BCAD] rounded-lg p-3 bg-[#32BCAD]/5">
                <img src={pixLogo} alt="Pix" className="h-9 w-9 object-contain" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">Pix</p>
                  <p className="text-xs text-gray-600">Aprovação na hora • 100% seguro</p>
                </div>
                <CheckCircle2 size={20} className="text-[#32BCAD]" />
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <h2 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Resumo do pedido</h2>
                <div className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600"><span>Valor do produto</span><span className="text-gray-800">{formatBRL(subtotal)}</span></div>
                  <div className="flex justify-between text-gray-600"><span>Frete</span><span className="text-[#2e8b57] font-semibold">Grátis</span></div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gradient-to-r from-[#f4f0fe] to-white border-t border-gray-100 flex items-end justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-gray-500 font-semibold">Total à vista</p>
                  <p className="text-[10px] text-gray-500">Pagamento via Pix · aprovação imediata</p>
                </div>
                <p className="text-2xl font-extrabold text-gray-900 leading-none">{formatBRL(total)}</p>
              </div>
            </section>

            <button
              onClick={handleContinue}
              disabled={!canContinue || pixLoading}
              className="w-full bg-[#f28100] hover:bg-[#e07700] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-full text-base shadow-sm transition flex items-center justify-center gap-2"
            >
              {pixLoading ? (<><Loader2 size={18} className="animate-spin" /> Gerando Pix...</>) : "Continuar para o pagamento"}
            </button>
            {!canContinue && <p className="text-center text-xs text-gray-500">Preencha o número do endereço para continuar.</p>}
          </>
        )}

        <Link to="/" className="block text-center text-sm text-[#6e0ad6] font-medium py-2">
          Voltar ao anúncio
        </Link>
      </main>
      {showExit && <ExitPurchaseSheet onClose={() => setShowExit(false)} onLeave={goBackToListing} />}
      {showWelcome && <PostLoginOverlay onClose={() => setShowWelcome(false)} />}
      {pix && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <img src={pixLogo} alt="Pix" className="h-6 w-6" />
                <h3 className="font-bold text-gray-900">Pague com Pix</h3>
              </div>
              <button onClick={() => { stopPolling(); setPix(null); }} className="text-gray-500 hover:text-gray-800"><X size={22} /></button>
            </div>
            <div className="p-4 space-y-4">
              {pixStatus === "PAID" ? (
                <div className="text-center py-6">
                  <CheckCircle2 size={56} className="text-[#2e8b57] mx-auto" />
                  <p className="mt-3 text-lg font-bold text-gray-900">Pagamento aprovado!</p>
                  <p className="text-sm text-gray-600 mt-1">Recebemos seu Pix de {formatBRL(pix.amountCents)}.</p>
                </div>
              ) : (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex justify-center">
                    <img
                      alt="QR Code Pix"
                      className="w-56 h-56 object-contain"
                      src={pix.qrcode.startsWith("data:") || pix.qrcode.startsWith("http") ? pix.qrcode : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(pix.qrcode)}`}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Pix copia e cola</p>
                    <div className="flex gap-2">
                      <input readOnly value={pix.qrcode} className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono bg-gray-50 truncate" />
                      <button onClick={copyPix} className="bg-[#6e0ad6] text-white px-3 rounded-lg flex items-center gap-1 text-sm font-semibold"><Copy size={16} /> Copiar</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between bg-[#32BCAD]/10 border border-[#32BCAD]/30 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">Total</span>
                    <span className="text-lg font-extrabold text-gray-900">{formatBRL(pix.amountCents)}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Loader2 size={14} className="animate-spin" /> Aguardando confirmação do pagamento...
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
