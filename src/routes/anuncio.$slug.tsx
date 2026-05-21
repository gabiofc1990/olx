import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { LoginSheet } from "@/components/LoginSheet";
import { PostLoginOverlay } from "@/components/PostLoginOverlay";
import { FavToast } from "@/components/FavToast";
import { SalesHistory } from "@/components/SalesHistory";
import { VerifiedBadge } from "@/components/VerifiedBadge";
const ChatWidget = lazy(() => import("@/components/ChatWidget").then(m => ({ default: m.ChatWidget })));
const Lightbox = lazy(() => import("@/components/Lightbox").then(m => ({ default: m.Lightbox })));
import {
  Heart, Camera, ShoppingCart, MessageCircle, MapPin,
  Award, Layers, Truck, CreditCard, Shield, X, Check,
  ChevronLeft, ChevronRight, Lock as LockIcon, HandCoins,
} from "lucide-react";
import {
  fetchListingBySlug, fetchListingImages, fetchCarouselWithThumbs, splitUniqueCarousels,
  formatBRL, type Listing, type ListingImage, type CarouselItem,
} from "@/lib/listings";
import { setSelectedItem, setSelectedCep, setReturnTo, consumeWelcome } from "@/lib/selected";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/anuncio/$slug")({ component: AnuncioPage });

// hash determinístico do slug
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; } return Math.abs(h); }
const DISPATCHES = ["30min – 1h", "45min – 2h", "1h – 3h", "30min – 3h", "45min – 3h", "1h – 4h"];
const SELLER_NAMES = ["Lucas", "Rafael", "Bruno", "Gabriel", "Matheus", "Pedro", "Felipe", "Diego", "Thiago", "André", "Vinícius", "Gustavo", "Rodrigo", "Marcelo", "Eduardo", "Caio", "Henrique", "Leonardo", "Igor", "Daniel"];

function AnuncioPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [images, setImages] = useState<ListingImage[]>([]);
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [tambem, setTambem] = useState<CarouselItem[]>([]);
  const [mais, setMais] = useState<CarouselItem[]>([]);
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [showGarantiaModal, setShowGarantiaModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepResult, setCepResult] = useState<null | { logradouro: string; bairro: string; localidade: string; uf: string; erro?: boolean }>(null);
  const [loginSheet, setLoginSheet] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [favTick, setFavTick] = useState(0);
  const [toast, setToast] = useState<{ show: boolean; added: boolean }>({ show: false, added: false });

  useEffect(() => {
    let cancelled = false;
    setListing(null);
    setImages([]);
    setTambem([]);
    setMais([]);
    setImgIdx(0);
    const fakeAuthed = () => { try { return localStorage.getItem("olx_fake_auth") === "1"; } catch { return false; } };
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s || fakeAuthed()));
    const onFakeAuth = () => setAuthed(true);
    window.addEventListener("olx_fake_auth_changed", onFakeAuth);
    if (consumeWelcome()) setShowWelcome(true);
    const onFav = () => setFavTick((n) => n + 1);
    window.addEventListener("olx_favorites_changed", onFav);
    (async () => {
      const { data } = await supabase.auth.getSession();
      const isAuthed = !!data.session || fakeAuthed();
      setAuthed(isAuthed);

      const l = await fetchListingBySlug(slug);
      if (cancelled) return;

      // Gate: if visitor arrived via shared link without an account/session,
      // send them to login showing the chosen product. After auth they return here.
      if (!isAuthed) {
        if (l) {
          const imgs = await fetchListingImages(l.id);
          setSelectedItem({
            listingId: l.id,
            title: l.title,
            sellerName: l.seller_name ?? "",
            priceCents: l.price_cents ?? 0,
            image: imgs[0]?.url ?? "",
            sellerSales: l.seller_sales ?? undefined,
            sourcePath: `/anuncio/${slug}`,
          });
        }
        setReturnTo(`/anuncio/${slug}`);
        navigate({ to: "/login", search: { slug } as any });
        return;
      }

      setListing(l);
      if (l) {
        setImages(await fetchListingImages(l.id));
        const [t, m] = await Promise.all([
          fetchCarouselWithThumbs("tambem"),
          fetchCarouselWithThumbs("mais")
        ]);
        if (cancelled) return;
        const carousels = splitUniqueCarousels(t, m, [l.id]);
        setTambem(carousels.tambem);
        setMais(carousels.mais);
      }
    })();
    return () => { cancelled = true; sub.subscription.unsubscribe(); window.removeEventListener("olx_favorites_changed", onFav); window.removeEventListener("olx_fake_auth_changed", onFakeAuth); };
  }, [slug]);

  // valores determinísticos por slug: rating 4.0–5.0, reviews 8–40, dispatch random
  const meta = useMemo(() => {
    const h = hash(slug);
    const rating = Math.round((4 + ((h % 11) / 10)) * 10) / 10; // 4.0..5.0
    const reviews = 8 + (h % 33);
    const sales = 3 + ((h >> 3) % 18);
    const dispatch = DISPATCHES[(h >> 5) % DISPATCHES.length];
    return { rating, reviews, sales, canceled: 0, dispatch };
  }, [slug]);

  if (!listing) {
    return (
      <div className="bg-[#f9f9f9] min-h-screen pb-[140px]">
        <div className="p-8 text-center text-gray-500">Carregando...</div>
        <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
          <button disabled className="flex-1 bg-[#f28100] opacity-60 text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 text-[15px]"><ShoppingCart size={18} /> Comprar</button>
          <button disabled className="flex-1 bg-white border border-[#f28100] opacity-60 text-[#f28100] font-medium py-3 rounded-full flex items-center justify-center gap-2 text-[15px]"><MessageCircle size={18} /> Chat</button>
        </div>
      </div>
    );
  }

  const itemImages = images.map((i) => i.url);
  const priceLabel = formatBRL(listing.price_cents);
  const sellerName = listing.seller_name && listing.seller_name !== "Jonatan"
    ? listing.seller_name
    : SELLER_NAMES[hash(slug) % SELLER_NAMES.length];
  const locationLabel = listing.location_text ?? "Brasil";

  const HOME_ITEM = {
    listingId: listing.id,
    title: listing.title,
    sellerName,
    priceCents: listing.price_cents,
    image: itemImages[0] ?? "",
    sellerSales: listing.is_main ? (listing.seller_sales ?? 1) : meta.sales,
    sourcePath: `/anuncio/${slug}`,
  };

  const handleBuy = () => {
    setSelectedItem(HOME_ITEM);
    if (!authed) { setReturnTo("/entrega"); navigate({ to: "/login" }); }
    else navigate({ to: "/entrega" });
  };

  const handleFavClick = (id: string) => {
    if (!authed) { setLoginSheet(true); return; }
    const added = toggleFavorite(id);
    setFavTick((n) => n + 1);
    setToast({ show: true, added });
    setTimeout(() => setToast((t) => ({ ...t, show: false })), 2200);
  };

  const handleCepChange = async (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 8);
    const formatted = digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
    setCep(formatted); setCepResult(null);
    if (digits.length === 8) {
      setSelectedCep(formatted); setCepLoading(true);
      try { const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`); setCepResult(await res.json()); }
      catch { setCepResult({ logradouro: "", bairro: "", localidade: "", uf: "", erro: true }); }
      finally { setCepLoading(false); }
    }
  };

  const LogoOLX = ({ className = "" }) => (
    <div className={`flex items-center gap-0.5 font-black text-2xl tracking-tighter ${className}`}>
      <span className="text-[#6e0ad6] leading-none">o</span>
      <span className="text-[#91eb33] leading-none">l</span>
      <span className="text-[#f28100] leading-none">x</span>
    </div>
  );

  const VerifiedCheck = ({ size = 12 }: { size?: number }) => (
    <div className="bg-[#4caf50] text-white rounded-full p-[1px] flex items-center justify-center shrink-0">
      <Check size={size} strokeWidth={4} />
    </div>
  );

  const Card = ({ item }: { item: CarouselItem }) => {
    const fav = isFavorite(item.id);
    return (
      <Link to="/anuncio/$slug" params={{ slug: item.slug }} className="snap-start shrink-0 w-[33.333%] pr-2 block">
        <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
          {item.thumb && <img src={item.thumb} alt={item.title} width={400} height={400} loading="lazy" decoding="async" className="w-full h-full object-cover" />}
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFavClick(item.id); }} className="absolute top-1.5 right-1.5 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
            <Heart size={13} className={fav ? "text-[#e62117]" : "text-gray-700"} fill={fav ? "#e62117" : "none"} />
          </button>
        </div>
        <p className="text-[12px] text-gray-800 mt-2 leading-tight line-clamp-2 min-h-[32px]">{item.title}</p>
        <span className="inline-block mt-1 bg-[#f1f0ff] text-[#6e0ad6] px-1.5 py-0.5 rounded text-[9px] font-medium">Entrega Fácil</span>
        <p className="text-[13px] font-bold text-gray-900 mt-1 tracking-tight">{formatBRL(item.price_cents)}</p>
        <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{item.posted_at ?? ""}</p>
      </Link>
    );
  };

  return (
    <div className="bg-[#f9f9f9] min-h-screen font-sans text-[#1c1c1c] pb-[140px]">
      <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
        <button onClick={handleBuy} className="flex-1 bg-[#f28100] hover:bg-[#e07700] text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 text-[15px] tracking-tight shadow-sm">
          <ShoppingCart size={18} /> Comprar
        </button>
        <button onClick={() => { setSelectedItem(HOME_ITEM); try { sessionStorage.setItem("olx_chat_back", `/anuncio/${slug}`); } catch {} if (!authed) { setReturnTo(`/chat?listingId=${listing.id}`); navigate({ to: "/login" }); } else { navigate({ to: "/chat", search: { listingId: listing.id } }); } }} className="flex-1 bg-white border border-[#f28100] text-[#f28100] font-medium py-3 rounded-full flex items-center justify-center gap-2 text-[15px] tracking-tight hover:bg-[#fff5eb] transition">
          <MessageCircle size={18} /> Chat
        </button>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between max-w-md mx-auto sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Link to="/" className="text-gray-700"><ChevronLeft size={22} /></Link>
          <LogoOLX />
        </div>
        <div className="flex items-center gap-5 text-gray-700">
          <button onClick={() => handleFavClick(listing.id)} aria-label="Favoritar">
            <Heart size={22} className={isFavorite(listing.id) ? "text-[#e62117]" : "text-gray-700"} fill={isFavorite(listing.id) ? "#e62117" : "none"} />
          </button>
        </div>
      </div>

      <div className="relative bg-gradient-to-b from-gray-100 to-gray-50 aspect-[4/3] w-full max-w-md mx-auto overflow-hidden border-b border-gray-100">
        <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${imgIdx * 100}%)` }}>
          {itemImages.map((src, i) => (
            <button key={src} type="button" onClick={() => setLightboxOpen(true)} aria-label={`Ampliar imagem ${i + 1}`} className="w-full h-full shrink-0 flex items-center justify-center cursor-zoom-in">
              <img src={src} alt={`${listing.title} ${i + 1}`} fetchPriority={i === 0 ? "high" : "auto"} decoding="async" loading={i === 0 ? "eager" : "lazy"} className="w-full h-full object-contain" draggable={false} />
            </button>
          ))}
        </div>
        {itemImages.length > 1 && (
          <>
            <button type="button" onClick={() => setImgIdx((i) => (i - 1 + itemImages.length) % itemImages.length)} aria-label="Imagem anterior" className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-95">
              <ChevronLeft size={20} className="text-gray-800" />
            </button>
            <button type="button" onClick={() => setImgIdx((i) => (i + 1) % itemImages.length)} aria-label="Próxima imagem" className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-95">
              <ChevronRight size={20} className="text-gray-800" />
            </button>
          </>
        )}
        <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 rounded-md text-white text-[11px] flex items-center gap-1">
          <Camera size={14} /> {imgIdx + 1}/{Math.max(itemImages.length, 1)}
        </div>
      </div>

      {lightboxOpen && <Suspense fallback={null}><Lightbox images={itemImages} open={lightboxOpen} initialIndex={imgIdx} onClose={() => setLightboxOpen(false)} alt={listing.title} /></Suspense>}


      <div className="max-w-md mx-auto bg-white p-4 shadow-sm">
        <p className="text-[#8c8c8c] text-xs mb-1 font-normal tracking-tight">{listing.posted_at ?? ""}{locationLabel ? ` em ${locationLabel}` : ""}</p>
        <h1 className="text-[20px] font-medium mb-4 tracking-tight leading-tight">{listing.title}</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="bg-[#e7f9ee] text-[#2e8b57] px-2 py-1 rounded-md text-[12px] font-medium flex items-center gap-1"><Truck size={14} /> Frete grátis</span>
          <span className="bg-[#f1f0ff] text-[#6e0ad6] px-2 py-1 rounded-md text-[12px] font-medium flex items-center gap-1"><LockIcon size={13} /> Pague Online</span>
          <span className="bg-[#f1f0ff] text-[#6e0ad6] px-2 py-1 rounded-md text-[12px] font-medium flex items-center gap-1"><CreditCard size={13} /> Parcelamento sem juros</span>
          <span className="bg-[#f1f0ff] text-[#6e0ad6] px-2 py-1 rounded-md text-[12px] font-medium flex items-center gap-1"><Shield size={13} /> Garantia da OLX</span>
        </div>

        <div className="mb-4">
          <h2 className="text-[44px] font-bold leading-none mb-3 tracking-tighter">{priceLabel}</h2>
          <div className="flex items-center gap-1.5 mt-2 mb-2 flex-wrap">
            <div className="w-7 h-7 bg-[#32BCAD] rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[8px]">Pix</span>
            </div>
          </div>
          <button type="button" onClick={() => { setSelectedItem(HOME_ITEM); try { sessionStorage.setItem("olx_chat_back", `/anuncio/${slug}`); } catch {} if (!authed) { setReturnTo(`/chat?listingId=${listing.id}`); navigate({ to: "/login" }); } else { navigate({ to: "/chat", search: { listingId: listing.id } }); } }} className="flex items-center gap-2 mt-3 text-[#6e0ad6] font-medium text-[14px]">
            <HandCoins size={18} /> Fazer oferta
          </button>
        </div>

        {listing.description && <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{listing.description}</p>}

        <div className="mt-4 space-y-1 text-sm text-gray-700">
          {listing.brand && <p><b>Marca:</b> {listing.brand}</p>}
          {listing.model && <p><b>Modelo:</b> {listing.model}</p>}
          {listing.condition && <p><b>Condição:</b> {listing.condition}</p>}
          {listing.storage_capacity && <p><b>Armazenamento:</b> {listing.storage_capacity}</p>}
          {listing.color && <p><b>Cor:</b> {listing.color}</p>}
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white p-4 border-t border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-normal text-sm">Calcule o frete</h3>
          <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer" className="text-[#6e0ad6] text-[13px] font-medium">Não sei meu CEP</a>
        </div>
        <div className="border-b border-gray-200 pb-1">
          <input type="text" inputMode="numeric" value={cep} onChange={(e) => handleCepChange(e.target.value)} placeholder="Digite o CEP para ver o frete" className="w-full text-base placeholder:text-[#8c8c8c] focus:outline-none py-1" />
        </div>
        {cepLoading && <p className="text-xs text-gray-500 mt-2">Buscando endereço...</p>}
        {cepResult && !cepResult.erro && (
          <div className="mt-3 p-3 rounded-lg bg-[#f1ecff] border border-[#d6bbff]">
            <p className="text-sm text-gray-800 font-medium">
              {cepResult.logradouro ? `${cepResult.logradouro}, ` : ""}{cepResult.bairro ? `${cepResult.bairro} - ` : ""}{cepResult.localidade}/{cepResult.uf}
            </p>
            <p className="text-sm font-bold text-[#2e8b57] mt-1 flex items-center gap-1"><Truck size={14} /> Frete GRÁTIS por conta da OLX!</p>
            <p className="text-[12px] text-[#2e8b57] font-medium mt-0.5">Chega hoje mesmo na sua casa 🚀</p>
          </div>
        )}
        {cepResult?.erro && <p className="text-xs text-red-600 mt-2">CEP não encontrado. Verifique e tente novamente.</p>}
      </div>

      {chatOpen && <Suspense fallback={null}><ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} sellerName={sellerName} listingTitle={listing.title} /></Suspense>}

      <div className="max-w-md mx-auto bg-white mt-1 p-4 pt-6 border-t border-gray-100">
        <h3 className="font-bold mb-6 text-xl tracking-tight leading-none">Localização</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#f0ebff] rounded-full flex items-center justify-center overflow-hidden">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-[#6e0ad6] rounded-sm bg-white relative">
                <div className="absolute inset-x-0 top-1 h-0.5 bg-[#6e0ad6]/20"></div>
                <div className="absolute inset-x-0 top-3 h-0.5 bg-[#6e0ad6]/20"></div>
                <div className="absolute inset-x-0 top-5 h-0.5 bg-[#6e0ad6]/20"></div>
                <div className="absolute left-1/2 bottom-0 w-2 h-3 bg-[#6e0ad6] -translate-x-1/2"></div>
              </div>
            </div>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg leading-tight tracking-tight">{locationLabel.split(",")[0]}</p>
            <p className="text-sm text-gray-500 mt-1 font-medium tracking-tight leading-none">{locationLabel}</p>
          </div>
        </div>
      </div>

      {tambem.length > 0 && (
        <div className="max-w-md mx-auto mt-6 pl-4 border-t border-gray-200 pt-6">
          <h3 className="font-bold text-gray-800 mb-4 text-lg tracking-tight">Também podem te interessar</h3>
          <div className="flex overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
            {tambem.map((it) => <Card key={it.id} item={it} />)}
          </div>
        </div>
      )}

      {mais.length > 0 && (
        <div className="max-w-md mx-auto mt-6 pl-4">
          <h3 className="font-bold text-gray-800 mb-4 text-lg tracking-tight">Mais procurados em Celulares e Smartphones</h3>
          <div className="flex overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-hide">
            {mais.map((it) => <Card key={it.id} item={it} />)}
          </div>
        </div>
      )}

      <div className="max-w-md mx-auto mt-4 px-4 border-t border-gray-200 pt-8">
        <h3 className="font-bold text-gray-800 mb-4 text-xl tracking-tight leading-tight">Sobre o anunciante</h3>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="flex flex-col items-center mb-6">
            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mb-1 tracking-tight uppercase leading-none">Conta verificada <VerifiedBadge size={14} /></p>
            <h4 className="text-xl font-bold text-gray-900 tracking-tight">{sellerName}</h4>
            <p className="text-[11px] text-gray-400 font-medium tracking-tight">Último acesso há 3 minutos</p>
          </div>

          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tight">Nível: <span className="bg-[#e7f9ee] text-[#2e8b57] px-2 py-0.5 rounded-full flex items-center gap-1 font-black text-[10px] uppercase tracking-tighter"><Award size={10} /> Avançado</span></p>
          </div>
          <div className="flex gap-1 h-2 w-full mb-6 px-1">
            <div className="flex-1 bg-[#d1a3ff] rounded-full"></div>
            <div className="flex-1 bg-[#9c27b0] rounded-full"></div>
            <div className="flex-1 bg-[#6e0ad6] rounded-full shadow-inner"></div>
            <div className="flex-1 bg-[#f0f0f0] rounded-full"></div>
          </div>

          <div className="space-y-3 mb-8 px-1 text-gray-600 font-medium text-sm tracking-tight">
            <div className="flex items-center gap-3"><Layers size={18} className="text-gray-400" /> <p>{listing.seller_since ?? "Na OLX desde dezembro de 2022"}</p></div>
            <div className="flex items-center gap-3"><MapPin size={18} className="text-gray-400" /> <p>{locationLabel}</p></div>
          </div>

          <SalesHistory rating={meta.rating} reviews={meta.reviews} sales={meta.sales} canceled={0} dispatch={meta.dispatch} />

          <div className="border-t border-gray-100 pt-6 mt-6">
            <h5 className="font-bold text-gray-800 mb-5 text-base tracking-tight leading-none uppercase">Informações verificadas</h5>
            <div className="space-y-4 px-1 mb-6">
              {["E-mail", "Telefone", "Identidade", "Facebook"].map((v) => (
                <div key={v} className="flex items-center gap-3 text-[15px] font-normal text-gray-800 tracking-tight">
                  <VerifiedCheck /> {v}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 mt-12">
        <h3 className="font-bold text-gray-800 mb-4 text-2xl tracking-tighter leading-none">Este anúncio oferece</h3>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm space-y-8">
          <div className="flex gap-4 items-start">
            <div className="text-gray-800 mt-1"><Shield size={28} /></div>
            <div>
              <p className="font-bold text-base leading-none tracking-tight uppercase">Garantia da OLX</p>
              <p className="text-sm text-gray-500 leading-normal mt-1.5 font-medium tracking-tight">Pague online e receba o que comprou ou a OLX devolve seu dinheiro.</p>
              <button onClick={() => setShowGarantiaModal(true)} className="text-[#6e0ad6] text-sm font-bold underline mt-1 tracking-tight">Saiba mais</button>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="text-gray-800 mt-1"><Layers size={28} /></div>
            <div>
              <p className="font-bold text-base leading-none tracking-tight uppercase">Pagamento via Pix</p>
              <p className="text-sm text-gray-500 leading-normal mt-1.5 font-medium tracking-tight">Pague de forma rápida e segura com aprovação na hora.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="text-gray-800 mt-1"><Truck size={28} /></div>
            <div>
              <p className="font-bold text-base leading-none tracking-tight uppercase">Entrega fácil</p>
              <p className="text-sm text-gray-500 leading-normal mt-1.5 font-medium tracking-tight">Receba ou retire seu produto onde quiser com segurança.</p>
              <button onClick={() => setShowEntregaModal(true)} className="text-[#6e0ad6] text-sm font-bold underline mt-1 tracking-tight">Saiba mais</button>
            </div>
          </div>
        </div>
      </div>

      {showEntregaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowEntregaModal(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowEntregaModal(false)} className="absolute top-4 right-4 text-gray-600"><X size={22} /></button>
            <h3 className="text-lg font-bold text-gray-900 mb-6">Entrega fácil</h3>
            <p className="text-sm text-gray-600">Receba ou retire seu produto com segurança.</p>
          </div>
        </div>
      )}

      {showGarantiaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowGarantiaModal(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowGarantiaModal(false)} className="absolute top-4 right-4 text-gray-600"><X size={22} /></button>
            <h3 className="text-lg font-bold text-gray-900 mb-3">Garantia da OLX</h3>
            <p className="text-sm text-gray-600">Receba o que comprou ou seu dinheiro de volta.</p>
          </div>
        </div>
      )}

      <LoginSheet open={loginSheet} onClose={() => setLoginSheet(false)} />
      <FavToast show={toast.show} added={toast.added} />
      {showWelcome && <PostLoginOverlay onClose={() => setShowWelcome(false)} />}
      <span className="hidden">{favTick}</span>
    </div>
  );
}
