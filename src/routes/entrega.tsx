import { ExitPurchaseSheet } from "@/components/ExitPurchaseSheet";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X, ChevronLeft, MapPin, Info, Check, Copy, Loader2, ShieldCheck, Clock } from "lucide-react";
import { getSelectedItem, getSelectedCep, setSelectedCep, type SelectedItem } from "@/lib/selected";
import pixLogo from "@/assets/pix-logo.png";
import vanDelivery from "@/assets/van-delivery.webp";
import shakeHands from "@/assets/shake-hands.webp";
import { createPixCharge, checkPixStatus } from "@/lib/bspay.functions";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/entrega")({ component: EntregaPage });

const FALLBACK: SelectedItem = {
  title: "iPhone 17 pro",
  sellerName: "Jonatan",
  priceCents: 675000,
  image: "https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=400",
};

type Address = {
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  referencia: string;
  bairro: string;
  cidade: string;
  uf: string;
  principal: boolean;
};

type Step = "method" | "delivery" | "payment" | "review" | "pix";

function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function EntregaPage() {
  const navigate = useNavigate();
  const goBackToListing = () => {
    const src = getSelectedItem()?.sourcePath;
    navigate({ to: (src && src.startsWith("/") ? src : "/") as string });
  };
  const [item, setItem] = useState<SelectedItem>(() => {
    if (typeof window === "undefined") return FALLBACK;
    return getSelectedItem() ?? FALLBACK;
  });
  const [step, setStep] = useState<Step>("method");
  const [method, setMethod] = useState<"olx" | "vendedor">("olx");
  const [address, setAddress] = useState<Address | null>(null);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const [pix, setPix] = useState<{ transactionId: string; qrcode: string; amountCents: number } | null>(null);
  const [payErr, setPayErr] = useState<string>("");
  const createPix = useServerFn(createPixCharge);

  useEffect(() => {
    const s = getSelectedItem();
    if (s) setItem(s);
  }, []);

  const progress =
    step === "method" ? "w-1/4" : step === "delivery" ? "w-2/4" : step === "payment" ? "w-3/4" : "w-full";

  // ===== METHOD STEP =====
  if (step === "method") {
    return (
      <div className="min-h-screen bg-white max-w-md mx-auto flex flex-col">
        <header className="px-4 pt-4 pb-2 flex items-center">
          <button onClick={() => setShowExit(true)} className="text-gray-700 -ml-1 p-1">
            <X size={26} />
          </button>
        </header>

        <div className="px-5 pt-3 pb-6">
          <h1 className="text-[26px] font-bold leading-tight text-[#1c1c1c]">
            Como você quer receber o produto?
          </h1>
        </div>

        <div className="px-5 space-y-4">
          {/* Entrega pela OLX */}
          <div
            className={`relative rounded-xl ${
              method === "olx" ? "border-2 border-[#6e0ad6]" : "border border-gray-200"
            } bg-white p-4 pt-5`}
          >
            <span className="absolute -top-2.5 left-4 bg-[#f1eafe] text-[#6e0ad6] text-[11px] font-bold px-2 py-0.5 rounded">
              Recomendado
            </span>
            <button
              type="button"
              onClick={() => setMethod("olx")}
              className="w-full text-left flex items-start gap-3"
            >
              <div className="w-14 h-14 grid place-items-center shrink-0">
                <img src={vanDelivery} alt="Entrega" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[16px] text-[#1c1c1c] leading-tight">
                  Entrega pela OLX
                </p>
                {address ? (
                  <>
                    <p className="text-[13px] text-[#1c1c1c] leading-snug mt-0.5">
                      {address.rua}, {address.numero}
                    </p>
                    <p className="text-[12px] text-gray-500 leading-snug">
                      {address.bairro}, {address.cidade}, {address.uf}
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] text-gray-500 leading-snug">
                    Adicione seu endereço
                    <br />
                    para calcular o frete
                  </p>
                )}
              </div>
              <span
                className={`w-5 h-5 rounded-full border-2 ${
                  method === "olx" ? "border-[#6e0ad6]" : "border-gray-300"
                } grid place-items-center shrink-0 mt-1`}
              >
                {method === "olx" && <span className="w-2.5 h-2.5 rounded-full bg-[#6e0ad6]" />}
              </span>
            </button>
            <div className="border-t border-gray-200 mt-3 pt-3">
              <button
                type="button"
                onClick={() => {
                  setMethod("olx");
                  setShowAddressModal(true);
                }}
                className="text-[#6e0ad6] font-bold text-[14px]"
              >
                {address ? "Mudar endereço" : "Adicionar endereço"}
              </button>
            </div>
          </div>

          {/* Retirar com vendedor */}
          <button
            type="button"
            onClick={() => setMethod("vendedor")}
            className={`relative w-full text-left rounded-xl ${
              method === "vendedor" ? "border-2 border-[#6e0ad6]" : "border border-gray-200"
            } bg-white p-4`}
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 grid place-items-center shrink-0">
                <img src={shakeHands} alt="Combinar" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[16px] text-[#1c1c1c] leading-tight">
                  Retirar com vendedor
                </p>
                <p className="text-[13px] text-gray-500 leading-snug">
                  Combine diretamente com
                  <br />
                  ele <span className="text-[#6e0ad6] underline">através do chat da OLX</span>.
                </p>
              </div>
              <span
                className={`w-5 h-5 rounded-full border-2 ${
                  method === "vendedor" ? "border-[#6e0ad6]" : "border-gray-300"
                } grid place-items-center shrink-0`}
              >
                {method === "vendedor" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6e0ad6]" />
                )}
              </span>
            </div>
            {item.sellerName && (
              <div className="border-t border-gray-200 mt-3 pt-3 flex items-center gap-1.5 text-[13px] text-gray-700">
                <MapPin size={14} className="text-gray-500" />
                Combinar com {item.sellerName}
              </div>
            )}
          </button>

          {/* Info banner — only when address added & olx */}
          {method === "olx" && address && (
            <div className="bg-[#e9f6ff] border border-[#d3edff] rounded-xl p-3 flex gap-2">
              <Info size={18} className="text-[#0a6aa8] shrink-0 mt-0.5" />
              <p className="text-[13px] text-[#0a6aa8] leading-snug">
                O vendedor tem um período de até <b>2 horas</b> para a postagem do produto após
                a confirmação de pagamento. Se esse prazo não for cumprido, você pode cancelar
                a compra e o valor será estornado automaticamente.
              </p>
            </div>
          )}
        </div>

        <div className="flex-1" />

        <FooterBar progress={progress}>
          <span />
          <button
            onClick={() => {
              if (method === "vendedor") setStep("payment");
              else if (address) setStep("delivery");
              else setShowAddressModal(true);
            }}
            className="bg-[#f28100] text-white font-bold px-10 py-3 rounded-full text-[15px] shadow-sm"
          >
            Continuar
          </button>
        </FooterBar>

        {showAddressModal && (
          <AddressModal
            initial={address}
            onClose={() => setShowAddressModal(false)}
            onSave={(a) => {
              setAddress(a);
              setSelectedCep(a.cep);
              setShowAddressModal(false);
            }}
          />
        )}
        {showExit && <ExitPurchaseSheet onClose={() => setShowExit(false)} onLeave={goBackToListing} />}
      </div>
    );
  }

  // ===== DELIVERY STEP =====
  if (step === "delivery") {
    return (
      <div className="min-h-screen bg-white max-w-md mx-auto flex flex-col">
        <header className="px-4 pt-4 pb-2 flex items-center">
          <button onClick={() => setShowExit(true)} className="text-gray-700 -ml-1 p-1">
            <X size={26} />
          </button>
        </header>

        <div className="px-5 pt-3 pb-6">
          <h1 className="text-[26px] font-bold leading-tight text-[#1c1c1c]">
            Escolha o prazo de entrega
          </h1>
        </div>

        <div className="px-5 space-y-4">
          <div className="bg-[#f5f5f5] rounded-xl p-3 flex items-start gap-2">
            <MapPin size={18} className="text-gray-700 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-[14px] text-[#1c1c1c] leading-snug">
                {address?.rua}, {address?.numero}, {address?.bairro}
                <br />
                {address?.cidade} - {address?.uf}
              </p>
              <button
                onClick={() => {
                  setStep("method");
                  setShowAddressModal(true);
                }}
                className="text-[#6e0ad6] underline font-medium text-[14px] mt-1"
              >
                Mudar endereço
              </button>
            </div>
          </div>

          <div className="rounded-xl border-2 border-[#6e0ad6] p-4">
            <div className="flex items-start gap-3">
              <span className="w-5 h-5 rounded-full border-2 border-[#6e0ad6] grid place-items-center shrink-0 mt-0.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#6e0ad6]" />
              </span>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-[16px] text-[#1c1c1c]">Expressa</p>
                    <p className="text-[13px] text-gray-500">Até 5 horas de entrega</p>
                  </div>
                  <span className="text-[#2e8b57] font-bold text-[14px] whitespace-nowrap">
                    Frete grátis
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <FooterBar progress={progress}>
          <button
            onClick={() => setStep("method")}
            className="bg-white border border-gray-300 text-[#1c1c1c] font-bold px-8 py-3 rounded-full text-[15px]"
          >
            Voltar
          </button>
          <button
            onClick={() => setStep("payment")}
            className="bg-[#f28100] text-white font-bold px-10 py-3 rounded-full text-[15px] shadow-sm"
          >
            Continuar
          </button>
        </FooterBar>
        {showExit && <ExitPurchaseSheet onClose={() => setShowExit(false)} onLeave={goBackToListing} />}
      </div>
    );
  }

  // ===== PAYMENT STEP =====
  const subtotal = item.priceCents;
  const total = subtotal;
  const listingId = typeof item.listingId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.listingId)
    ? item.listingId
    : undefined;

  const handleContinueToReview = () => {
    setStep("review");
  };

  const handlePay = async (payer: { nome: string; cpf: string }) => {
    setSubmitting(true);
    setPayErr("");
    try {
      const res = await createPix({
        data: {
          amountCents: total,
          listingId,
          payerName: payer.nome,
          payerDocument: payer.cpf.replace(/\D/g, ""),
          description: `Compra ${item.title}`.slice(0, 140),
        },
      });
      setPix({ transactionId: res.transactionId, qrcode: res.qrcode, amountCents: res.amountCents });
      setStep("pix");
    } catch (e: any) {
      setPayErr(e?.message ?? "Falha ao gerar Pix. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === "payment") {
    return (
      <div className="min-h-screen bg-white max-w-md mx-auto flex flex-col">
        <header className="px-4 pt-4 pb-2 flex items-center">
          <button onClick={() => setShowExit(true)} className="text-gray-700 -ml-1 p-1">
            <X size={26} />
          </button>
        </header>

        <div className="px-5 pt-3 pb-6">
          <h1 className="text-[26px] font-bold leading-tight text-[#1c1c1c]">
            Escolha como quer pagar
          </h1>
        </div>

        <div className="px-5 space-y-4">
          <p className="text-[12px] font-bold text-gray-500 tracking-wider uppercase">
            Pagamentos digitais
          </p>

          <div className="rounded-xl border-2 border-[#6e0ad6] p-4 bg-white">
            <div className="flex items-center gap-3">
              <span className="w-5 h-5 rounded-full bg-[#6e0ad6] grid place-items-center shrink-0">
                <Check size={14} className="text-white" strokeWidth={3} />
              </span>
              <div className="w-12 h-12 grid place-items-center shrink-0">
                <img src={pixLogo} alt="Pix" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-[16px] text-[#1c1c1c]">Pix</p>
                <p className="text-[13px] text-gray-500 leading-snug">
                  A confirmação do seu pagamento é mais rápida
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1" />

        <FooterBar progress={progress}>
          <button
            onClick={() => setStep(method === "vendedor" ? "method" : "delivery")}
            className="bg-white border border-gray-300 text-[#1c1c1c] font-bold px-8 py-3 rounded-full text-[15px]"
          >
            Voltar
          </button>
          <button
            onClick={handleContinueToReview}
            disabled={submitting}
            className="bg-[#f28100] disabled:opacity-60 text-white font-bold px-10 py-3 rounded-full text-[15px] shadow-sm"
          >
            Continuar
          </button>
        </FooterBar>
        {showExit && <ExitPurchaseSheet onClose={() => setShowExit(false)} onLeave={goBackToListing} />}
      </div>
    );
  }

  // ===== PIX STEP =====
  if (step === "pix" && pix) {
    return (
      <PixStep
        item={item}
        pix={pix}
        onExit={() => setShowExit(true)}
        onBack={() => setStep("review")}
        onPaid={() => navigate({ to: "/" })}
        showExit={showExit}
        closeExit={() => setShowExit(false)}
        leave={goBackToListing}
      />
    );
  }

  // ===== REVIEW STEP =====
  return (
    <ReviewStep
      item={item}
      subtotal={subtotal}
      total={total}
      progress={progress}
      submitting={submitting}
      payErr={payErr}
      onBack={() => setStep("payment")}
      onExit={() => setShowExit(true)}
      onChangePayment={() => setStep("payment")}
      onPay={handlePay}
      showExit={showExit}
      closeExit={() => setShowExit(false)}
      leave={goBackToListing}
    />
  );
}

function ReviewStep({
  item, subtotal, total, progress, submitting, payErr,
  onBack, onExit, onChangePayment, onPay, showExit, closeExit, leave,
}: {
  item: SelectedItem;
  subtotal: number;
  total: number;
  progress: string;
  submitting: boolean;
  payErr: string;
  onBack: () => void;
  onExit: () => void;
  onChangePayment: () => void;
  onPay: (payer: { nome: string; cpf: string }) => void;
  showExit: boolean;
  closeExit: () => void;
  leave: () => void;
}) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");

  // Generate seller display info from item (deterministic per item)
  const sellerInfo = (() => {
    const SOBRENOMES = ["Silva", "Souza", "Oliveira", "Santos", "Pereira", "Lima", "Costa", "Almeida", "Ferreira", "Rodrigues"];
    const base = (item.sellerName ?? "Jonatan").trim().split(/\s+/)[0];
    // Hash from item title for stability
    let h = 0;
    for (let i = 0; i < item.title.length; i++) h = (h * 31 + item.title.charCodeAt(i)) >>> 0;
    const sob = SOBRENOMES[h % SOBRENOMES.length];
    const inicial = sob[0];
    const mascarado = inicial + "*".repeat(Math.max(3, sob.length - 1));
    // Random last 5 digits of CPF (stable per item via hash)
    const seed = h;
    const last5 = String(seed % 100000).padStart(5, "0");
    return { nome: `${base} ${mascarado}...`, cpf: `***.***.${last5.slice(0, 3)}-${last5.slice(3)}` };
  })();

  const formatCpf = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 11);
    return d
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const valid = nome.trim().length > 2 && cpf.replace(/\D/g, "").length === 11;

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto flex flex-col">
      <header className="px-4 pt-4 pb-2 flex items-center">
        <button onClick={onExit} className="text-gray-700 -ml-1 p-1">
          <X size={26} />
        </button>
      </header>

      <div className="px-5 pt-3 pb-6">
        <h1 className="text-[26px] font-bold leading-tight text-[#1c1c1c]">
          Revise seu pedido
        </h1>
      </div>

      <div className="px-5 space-y-4 pb-4">
        {/* Produto */}
        <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <img src={item.image} alt={item.title} className="w-14 h-14 rounded-lg object-cover" />
          <p className="font-medium text-[15px] text-[#1c1c1c]">{item.title}</p>
        </div>

        {/* Vendedor */}
        <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gray-200 grid place-items-center text-gray-500 text-xs">👤</div>
          <div className="text-[13px] text-[#1c1c1c] leading-snug">
            <p>Vendedor: {sellerInfo.nome}</p>
            <p>CPF: {sellerInfo.cpf}</p>
          </div>
        </div>

        {/* Pagamento */}
        <div className="flex items-center justify-between pt-2">
          <p className="font-bold text-[15px] text-[#1c1c1c]">Método de<br/>pagamento</p>
          <button onClick={onChangePayment} className="text-[#6e0ad6] font-bold text-[14px]">
            Alterar pagamento
          </button>
        </div>

        <div className="border border-gray-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-12 h-12 grid place-items-center shrink-0">
            <img src={pixLogo} alt="Pix" className="w-full h-full object-contain" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[15px] text-[#1c1c1c]">Pix</p>
            <p className="text-[12px] text-gray-500 leading-snug">
              A confirmação do seu pagamento é mais rápida
            </p>
          </div>
          <p className="font-bold text-[15px] text-[#1c1c1c]">{formatBRL(total)}</p>
        </div>

        {/* Resumo valores */}
        <div className="space-y-2 pt-2 text-[14px]">
          <div className="flex justify-between">
            <span className="text-[#1c1c1c]">Valor do Produto</span>
            <span className="text-[#1c1c1c]">{formatBRL(subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#1c1c1c]">Entrega</span>
            <span className="text-[#2e8b57] font-bold">Frete grátis</span>
          </div>
        </div>

        <div className="flex justify-between items-center border-t border-gray-200 pt-3">
          <span className="font-bold text-[16px] text-[#1c1c1c]">Total a pagar</span>
          <span className="font-bold text-[16px] text-[#1c1c1c]">{formatBRL(total)}</span>
        </div>

        {/* Nome */}
        <div className="pt-2">
          <label className="block text-[14px] text-[#1c1c1c] mb-1.5">Nome completo*</label>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#6e0ad6] text-[15px]"
          />
        </div>

        {/* CPF */}
        <div>
          <label className="block text-[14px] text-[#1c1c1c] mb-1.5">CPF*</label>
          <input
            type="text"
            inputMode="numeric"
            value={cpf}
            onChange={(e) => setCpf(formatCpf(e.target.value))}
            placeholder="000.000.000-00"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#6e0ad6] text-[15px]"
          />
        </div>
      </div>

      <div className="flex-1" />

      <FooterBar progress={progress}>
        <button
          onClick={onBack}
          className="bg-white border border-gray-300 text-[#1c1c1c] font-bold px-8 py-3 rounded-full text-[15px]"
        >
          Voltar
        </button>
        <button
          onClick={() => onPay({ nome, cpf })}
          disabled={submitting || !valid}
          className="bg-[#f28100] disabled:opacity-60 text-white font-bold px-6 py-3 rounded-full text-[15px] shadow-sm"
        >
          {submitting ? "Processando..." : "Finalizar compra"}
        </button>
      </FooterBar>
      {payErr && (
        <p className="px-5 -mt-2 mb-2 text-[12px] text-red-600 text-center">{payErr}</p>
      )}
      {showExit && <ExitPurchaseSheet onClose={closeExit} onLeave={leave} />}
    </div>
  );
}


function FooterBar({ progress, children }: { progress: string; children: React.ReactNode }) {
  return (
    <div className="px-5 pb-6 pt-4">
      <div className="h-1 bg-gray-200 rounded-full mb-6 overflow-hidden">
        <div className={`h-full ${progress} bg-[#6e0ad6] rounded-full`} />
      </div>
      <div className="flex justify-between items-center gap-3">{children}</div>
    </div>
  );
}

// ===== Address modal =====
function AddressModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Address | null;
  onClose: () => void;
  onSave: (a: Address) => void;
}) {
  const [cep, setCep] = useState(initial?.cep ?? getSelectedCep() ?? "");
  const [rua, setRua] = useState(initial?.rua ?? "");
  const [numero, setNumero] = useState(initial?.numero ?? "");
  const [complemento, setComplemento] = useState(initial?.complemento ?? "");
  const [referencia, setReferencia] = useState(initial?.referencia ?? "");
  const [principal, setPrincipal] = useState(initial?.principal ?? true);
  const [bairro, setBairro] = useState(initial?.bairro ?? "");
  const [cidade, setCidade] = useState(initial?.cidade ?? "");
  const [uf, setUf] = useState(initial?.uf ?? "");
  const [loading, setLoading] = useState(false);

  const formatCep = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 8);
    return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
  };

  const handleCep = async (raw: string) => {
    const f = formatCep(raw);
    setCep(f);
    const digits = f.replace(/\D/g, "");
    if (digits.length === 8) {
      setLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setRua(data.logradouro || "");
          setBairro(data.bairro || "");
          setCidade(data.localidade || "");
          setUf(data.uf || "");
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
  };

  const valid = cep.replace(/\D/g, "").length === 8 && rua.trim() && numero.trim();

  return (
    <div className="fixed inset-0 z-50 bg-white max-w-md mx-auto flex flex-col">
      <header className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <button onClick={onClose} className="flex items-center gap-2 text-[#1c1c1c] font-bold">
          <ChevronLeft size={22} /> Endereço
        </button>
        <button onClick={onClose} className="text-gray-700">
          <X size={24} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        <label className="block">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[14px] text-[#1c1c1c]">CEP *</span>
            <a
              href="https://buscacepinter.correios.com.br/app/endereco/index.php"
              target="_blank"
              rel="noreferrer"
              className="text-[#6e0ad6] text-[13px] font-medium"
            >
              Não sei meu cep
            </a>
          </div>
          <input
            inputMode="numeric"
            value={cep}
            onChange={(e) => handleCep(e.target.value)}
            placeholder="00000-000"
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-[15px] outline-none focus:border-[#6e0ad6]"
          />
          {loading && <p className="text-[12px] text-gray-500 mt-1">Buscando endereço…</p>}
        </label>

        <label className="block">
          <span className="text-[14px] text-[#1c1c1c]">Rua *</span>
          <input
            value={rua}
            onChange={(e) => setRua(e.target.value)}
            className="mt-1.5 w-full border border-gray-300 rounded-xl px-3 py-3 text-[15px] outline-none focus:border-[#6e0ad6]"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[14px] text-[#1c1c1c]">Número *</span>
            <input
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              className="mt-1.5 w-full border border-gray-300 rounded-xl px-3 py-3 text-[15px] outline-none focus:border-[#6e0ad6]"
            />
          </label>
          <label className="block">
            <span className="text-[14px] text-[#1c1c1c]">Complemento</span>
            <input
              value={complemento}
              onChange={(e) => setComplemento(e.target.value)}
              className="mt-1.5 w-full border border-gray-300 rounded-xl px-3 py-3 text-[15px] outline-none focus:border-[#6e0ad6]"
            />
          </label>
        </div>

        <label className="block">
          <span className="text-[14px] text-[#1c1c1c]">Ponto de referência</span>
          <input
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            className="mt-1.5 w-full border border-gray-300 rounded-xl px-3 py-3 text-[15px] outline-none focus:border-[#6e0ad6]"
          />
        </label>

        <div className="flex items-center justify-between">
          <span className="text-[14px] text-[#1c1c1c]">Endereço principal</span>
          <button
            type="button"
            onClick={() => setPrincipal((p) => !p)}
            className={`relative w-12 h-7 rounded-full transition ${
              principal ? "bg-[#6e0ad6]" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition ${
                principal ? "left-[22px]" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-gray-100">
        <button
          disabled={!valid}
          onClick={() =>
            onSave({ cep, rua, numero, complemento, referencia, bairro, cidade, uf, principal })
          }
          className="w-full bg-[#f28100] disabled:bg-gray-300 text-white font-bold py-3.5 rounded-full text-[15px]"
        >
          Salvar endereço
        </button>
      </div>
    </div>
  );
}

// ===== PIX STEP COMPONENT =====
function PixStep({
  item, pix, onExit, onBack, onPaid, showExit, closeExit, leave,
}: {
  item: SelectedItem;
  pix: { transactionId: string; qrcode: string; amountCents: number };
  onExit: () => void;
  onBack: () => void;
  onPaid: () => void;
  showExit: boolean;
  closeExit: () => void;
  leave: () => void;
}) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<string>("PENDING");
  const [secondsLeft, setSecondsLeft] = useState<number>(15 * 60);
  const checkStatus = useServerFn(checkPixStatus);
  const pollRef = useRef<number | null>(null);
  const tickRef = useRef<number | null>(null);
  const paidHandled = useRef(false);

  const handlePaid = () => {
    if (paidHandled.current) return;
    paidHandled.current = true;
    setStatus("PAID");
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.18);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      o.start(); o.stop(ctx.currentTime + 0.42);
    } catch {/* ignore */}
    // Não redirecionar mais — exibir tela de comprovante
  };

  // Realtime subscription (instant) + polling fallback
  useEffect(() => {
    let cancelled = false;

    const channel = supabase
      .channel(`pix-${pix.transactionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "pix_payments", filter: `transaction_id=eq.${pix.transactionId}` },
        (payload: any) => {
          const s = payload?.new?.status;
          if (s && ["PAID", "APPROVED", "CONFIRMED"].includes(s)) handlePaid();
        }
      )
      .subscribe();

    const tick = async () => {
      try {
        const r = await checkStatus({ data: { transactionId: pix.transactionId } });
        if (cancelled) return;
        if (["PAID", "APPROVED", "CONFIRMED"].includes(r.status)) {
          handlePaid();
          return;
        }
      } catch {/* ignore */}
      pollRef.current = window.setTimeout(tick, 4000);
    };
    tick();

    return () => {
      cancelled = true;
      if (pollRef.current) window.clearTimeout(pollRef.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pix.transactionId]);

  // Countdown
  useEffect(() => {
    tickRef.current = window.setInterval(() => {
      setSecondsLeft(s => Math.max(0, s - 1));
    }, 1000);
    return () => { if (tickRef.current) window.clearInterval(tickRef.current); };
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pix.qrcode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {/* ignore */}
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const isPaid = status === "PAID" || status === "APPROVED" || status === "CONFIRMED";

  const totalSeconds = 15 * 60;
  const progress = Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100));
  const goChat = () => navigate({ to: "/chat" });

  return (
    <div className="min-h-screen bg-white max-w-md mx-auto flex flex-col">
      {/* Top bar: OLX logo + "Ir para o chat" */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-0.5 font-black text-2xl tracking-tighter">
          <span className="text-[#6e0ad6] leading-none">o</span>
          <span className="text-[#91eb33] leading-none">l</span>
          <span className="text-[#f28100] leading-none">x</span>
        </div>
        <button
          onClick={goChat}
          className="border border-[#f28100] text-[#f28100] font-medium text-[13px] px-4 py-1.5 rounded-full hover:bg-[#fff5eb] transition"
        >
          Ir para o chat
        </button>
      </header>

      {isPaid ? (
        <div className="px-5 py-8 flex flex-col items-center text-center">
          {/* Logo OLX em destaque */}
          <div className="flex items-center gap-0.5 font-black text-4xl tracking-tighter mb-6">
            <span className="text-[#6e0ad6] leading-none">o</span>
            <span className="text-[#91eb33] leading-none">l</span>
            <span className="text-[#f28100] leading-none">x</span>
          </div>

          {/* Check animado */}
          <div className="w-24 h-24 rounded-full bg-[#eafff3] grid place-items-center mb-4 ring-8 ring-[#eafff3]/40">
            <Check size={56} className="text-[#2e8b57]" strokeWidth={3} />
          </div>

          <h2 className="text-[24px] font-bold text-[#1c1c1c]">Pagamento confirmado!</h2>
          <p className="text-[14px] text-gray-600 mt-1.5 max-w-xs">
            Recebemos seu Pix com sucesso. Seu pedido já está sendo preparado.
          </p>

          <div className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-[#2e8b57] bg-[#eafff3] px-3 py-1.5 rounded-full">
            <ShieldCheck size={14} /> Compra protegida pela OLX Pay
          </div>

          {/* Card de comprovante */}
          <div className="mt-7 w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden text-left">
            <div className="px-4 py-3 bg-gradient-to-r from-[#f4f0fe] to-white border-b border-gray-100">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Comprovante de pagamento</p>
              <p className="text-[12px] text-gray-700 mt-0.5">
                {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="p-4 flex gap-3 border-b border-gray-100">
              {item.image && (
                <img src={item.image} alt={item.title} className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-bold text-[#1c1c1c] leading-tight line-clamp-2">{item.title}</p>
                <p className="text-[12px] text-gray-500 mt-1">Vendido por <span className="font-medium text-gray-700">{item.sellerName}</span></p>
              </div>
            </div>

            <div className="p-4 space-y-2 text-[13px]">
              <div className="flex justify-between text-gray-600">
                <span>Forma de pagamento</span>
                <span className="text-gray-900 font-medium flex items-center gap-1">
                  <img src={pixLogo} alt="" className="w-4 h-4" /> Pix
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Status</span>
                <span className="text-[#2e8b57] font-bold inline-flex items-center gap-1">
                  <Check size={14} strokeWidth={3} /> Aprovado
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>ID da transação</span>
                <span className="text-gray-900 font-mono text-[11px] truncate max-w-[160px]">{pix.transactionId}</span>
              </div>
              <div className="flex justify-between items-end pt-2 mt-1 border-t border-dashed border-gray-200">
                <span className="text-gray-600">Total pago</span>
                <span className="text-[20px] font-extrabold text-[#1c1c1c] leading-none">{formatBRL(pix.amountCents)}</span>
              </div>
            </div>
          </div>

          {/* Próximos passos */}
          <div className="mt-5 w-full bg-[#f1f0ff] border border-[#dccbfa] rounded-xl p-4 text-left flex gap-3">
            <ShieldCheck size={20} className="text-[#6e0ad6] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-bold text-[#1c1c1c]">E agora?</p>
              <p className="text-[12px] text-gray-700 mt-1 leading-snug">
                Entre em contato com o vendedor pelo chat para combinar a entrega. A OLX só libera o pagamento depois que você confirmar o recebimento.
              </p>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="mt-6 w-full space-y-3">
            <button
              onClick={goChat}
              className="w-full bg-[#f28100] hover:bg-[#e07700] text-white font-bold py-3.5 rounded-full text-[15px] shadow-sm transition"
            >
              Ir para o chat com o vendedor
            </button>
            <button
              onClick={() => navigate({ to: "/" })}
              className="w-full bg-white border border-[#6e0ad6] text-[#6e0ad6] font-bold py-3.5 rounded-full text-[15px] hover:bg-[#f4f0fe] transition"
            >
              Voltar ao anúncio
            </button>
          </div>
        </div>
      ) : (
        <div className="px-5 pt-4 pb-8">
          {/* Yellow warning banner */}
          <div className="bg-[#fff7e0] rounded-xl px-4 py-3 flex gap-3">
            <Info size={18} className="text-[#f28100] shrink-0 mt-0.5" />
            <p className="text-[13px] leading-snug text-[#5a4a1a]">
              Não pedimos comprovante do Pix e nem enviamos por e-mail. A <span className="font-bold">OLX</span> cuida do pagamento até você receber seu produto!
            </p>
          </div>

          {/* Timer + progress */}
          <div className="mt-5">
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-[#f28100] transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
              <Clock size={14} className="text-gray-700" />
              <span className="text-[13px] text-gray-700">
                Seu código expira em: <span className="font-bold text-[#f28100]">{mm}m {ss}s</span>
              </span>
            </div>
          </div>

          {/* Pague por Pix */}
          <div className="mt-6 flex items-center gap-3 border-b border-gray-200 pb-5">
            <img src={pixLogo} alt="Pix" className="w-10 h-10 object-contain" />
            <div>
              <p className="text-[14px] text-gray-700">Pague por Pix</p>
              <p className="text-[20px] font-bold text-[#1c1c1c] leading-tight">{formatBRL(pix.amountCents)}</p>
            </div>
          </div>

          {/* Step instructions */}
          <div className="mt-5">
            <p className="text-[14px] text-[#1c1c1c] mb-3">É rápido e prático. Veja como é fácil:</p>
            <ol className="space-y-3 text-[14px] text-[#1c1c1c] leading-snug">
              <li>1. Abra o app ou banco de sua preferência, escolha a opção pagar via Pix</li>
              <li>2. Escolha pagar Pix com QR Code e escaneie o código abaixo:</li>
              <li>
                3. Confira se o valor de <span className="font-bold">{formatBRL(pix.amountCents)}</span> bate com o do produto <span className="font-bold">{item.title}</span> que você escolheu, e se todas as informações estão corretas.
              </li>
              <li>4. Confirme o pagamento.</li>
            </ol>
          </div>

          {/* QR code */}
          <div className="mt-6 flex justify-center">
            <div className="bg-white p-2">
              <QRCodeSVG
                value={pix.qrcode}
                size={260}
                level="M"
                marginSize={1}
                bgColor="#ffffff"
                fgColor="#1c1c1c"
              />
            </div>
          </div>

          {/* Pix copia e cola section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-[16px] font-bold text-[#1c1c1c] leading-snug">
              Ou se preferir, faça o pagamento com o Pix copia e cola
            </h3>
            <p className="text-[13px] text-gray-700 mt-3 leading-snug">
              Acesse o app do seu banco ou Internet Banking, escolha a opção pagar com <span className="font-bold">Pix copia e cola</span>. Depois cole o código, confira se o valor bate com o do produto que você escolheu e se todas as informações estão corretas. Confirme o pagamento.
            </p>

            <div className="mt-4 bg-gray-100 rounded-md px-3 py-3 flex items-center gap-2">
              <span className="flex-1 text-[13px] text-gray-700 font-mono truncate">
                {pix.qrcode.slice(0, 32)}...
              </span>
              <button onClick={copy} className="text-[#6e0ad6] text-[13px] font-medium shrink-0">
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>

            <button
              onClick={copy}
              className="mt-4 w-full bg-[#f28100] hover:bg-[#e07700] text-white font-bold py-3.5 rounded-full text-[15px] flex items-center justify-center gap-2 transition"
            >
              {copied ? <><Check size={18} /> Copiado!</> : <><Copy size={18} /> Copiar código Pix</>}
            </button>

            <p className="text-[13px] text-[#1c1c1c] mt-4 leading-snug">
              <span className="font-bold">Prontinho!</span> A aprovação é imediata e você pode acompanhar o seu pedido em <span className="text-[#6e0ad6] font-medium">Minhas Compras</span>
            </p>
          </div>

          {/* Discreet polling indicator */}
          <div className="mt-6 flex items-center justify-center gap-2 text-gray-400 text-[12px]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <Loader2 size={12} className="animate-spin" />
            Aguardando confirmação do pagamento...
          </div>
        </div>
      )}

      {showExit && <ExitPurchaseSheet onClose={closeExit} onLeave={leave} />}
    </div>
  );
}
