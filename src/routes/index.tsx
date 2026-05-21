import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { LoginSheet } from "@/components/LoginSheet";
import { PostLoginOverlay } from "@/components/PostLoginOverlay";
import { FavToast } from "@/components/FavToast";
import { SalesHistory } from "@/components/SalesHistory";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import eloLogo from "@/assets/elo.png";
const ChatWidget = lazy(() => import("@/components/ChatWidget").then(m => ({ default: m.ChatWidget })));
const Lightbox = lazy(() => import("@/components/Lightbox").then(m => ({ default: m.Lightbox })));
import {
  Heart, Share2, Camera, ShoppingCart,
  MessageCircle, ShieldCheck, MapPin,
  Award, Layers,
  Facebook, Instagram, Youtube, Linkedin,
  Star, Ban, Truck, CreditCard, Shield, X, Check, Lock as LockIcon, HandCoins, ChevronLeft, ChevronRight
} from 'lucide-react';
import { fetchCarouselWithThumbs, splitUniqueCarousels, formatBRL, type CarouselItem } from "@/lib/listings";
import { setSelectedItem, setSelectedCep, setReturnTo, consumeWelcome } from "@/lib/selected";
import { isFavorite, toggleFavorite } from "@/lib/favorites";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: App,
});

const HOME_ID = "home-iphone-17-pro";

function App() {
  const navigate = useNavigate();
  const [showEntregaModal, setShowEntregaModal] = useState(false);
  const [showGarantiaModal, setShowGarantiaModal] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepResult, setCepResult] = useState<null | { logradouro: string; bairro: string; localidade: string; uf: string; erro?: boolean }>(null);
  const [loginSheet, setLoginSheet] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [favTick, setFavTick] = useState(0);
  const [authed, setAuthed] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; added: boolean }>({ show: false, added: false });
  const [imgIdx, setImgIdx] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [homeReady, setHomeReady] = useState(false);
  const [mainListing, setMainListing] = useState<any>(null);
  const [homeImages, setHomeImages] = useState<string[]>([]);
  const [tambem, setTambem] = useState<CarouselItem[]>([]);
  const [mais, setMais] = useState<CarouselItem[]>([]);


  useEffect(() => {
    const fakeAuthed = () => { try { return localStorage.getItem("olx_fake_auth") === "1"; } catch { return false; } };
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session || fakeAuthed()));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s || fakeAuthed()));
    const onFakeAuth = () => setAuthed(true);
    window.addEventListener("olx_fake_auth_changed", onFakeAuth);
    if (consumeWelcome()) setShowWelcome(true);
    try {
      const seen = localStorage.getItem("olx_first_visit_seen");
      const hide = localStorage.getItem("olx_hide_welcome");
      if (!seen && !hide) {
        setShowWelcome(true);
        localStorage.setItem("olx_first_visit_seen", "1");
      }
    } catch {}
    const onFav = () => setFavTick((n) => n + 1);
    window.addEventListener("olx_favorites_changed", onFav);
    (async () => {
      try {
        const [{ data: listing }, t, m] = await Promise.all([
          supabase.from("listings").select("*").eq("is_main", true).eq("published", true).limit(1).maybeSingle(),
          fetchCarouselWithThumbs("tambem"),
          fetchCarouselWithThumbs("mais"),
        ]);
        if (!listing) {
          const carousels = splitUniqueCarousels(t, m);
          setTambem(carousels.tambem);
          setMais(carousels.mais);
          setMainListing(null);
          setHomeImages([]);
          return;
        }
        const carousels = splitUniqueCarousels(t, m, [listing.id]);
        setTambem(carousels.tambem);
        setMais(carousels.mais);
        setMainListing(listing);
        const { data: imgs } = await supabase.from("listing_images").select("url").eq("listing_id", listing.id).order("display_order");
        const urls = (imgs ?? []).map((i: any) => i.url).filter(Boolean);
        setHomeImages(urls);
      } catch {
        setMainListing(null);
        setHomeImages([]);
      } finally {
        setHomeReady(true);
      }
    })();
    return () => { sub.subscription.unsubscribe(); window.removeEventListener("olx_favorites_changed", onFav); window.removeEventListener("olx_fake_auth_changed", onFakeAuth); };
  }, []);

  const HOME_IMAGES = homeImages;
  const primaryHomeImage = HOME_IMAGES[0] ?? "";
  const title = mainListing?.title ?? "";
  const priceCents = mainListing?.price_cents ?? 0;
  const priceLabel = mainListing ? `R$ ${(priceCents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "";
  const postedLabel = mainListing?.posted_at ?? "";
  const locationLabel = mainListing?.location_text ?? "";
  const sellerName = mainListing?.seller_name ?? "";
  const sellerSince = mainListing?.seller_since ?? "";
  const cityState = locationLabel.includes(",") ? locationLabel : (locationLabel || "");
  const cityOnly = cityState.split(",")[0].trim();
  const ufOnly = (cityState.split(",")[1] ?? "").trim();
  const HOME_ITEM = {
    listingId: mainListing?.id ?? HOME_ID,
    title,
    sellerName,
    priceCents,
    image: primaryHomeImage,
    sellerSales: mainListing?.seller_sales ?? 1,
    sourcePath: "/",
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
    setCep(formatted);
    setCepResult(null);
    if (digits.length === 8) {
      setSelectedCep(formatted);
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        setCepResult(data);
      } catch {
        setCepResult({ logradouro: "", bairro: "", localidade: "", uf: "", erro: true });
      } finally {
        setCepLoading(false);
      }
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

  if (!homeReady || !mainListing) {
    return (
      <div className="bg-[#f9f9f9] min-h-screen font-sans text-[#1c1c1c]">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between max-w-md mx-auto sticky top-0 z-50">
          <LogoOLX />
        </div>
        <div className="max-w-md mx-auto bg-white p-8 text-center text-gray-500">
          {homeReady ? "Anúncio indisponível." : "Carregando anúncio..."}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f9f9f9] min-h-screen font-sans text-[#1c1c1c] pb-[140px]">

      {/* sticky bottom CTA */}
      <div className="fixed bottom-[60px] left-1/2 -translate-x-1/2 w-full max-w-md z-40 bg-white border-t border-gray-200 px-4 py-3 flex gap-3">
        <button onClick={handleBuy} className="flex-1 bg-[#f28100] hover:bg-[#e07700] text-white font-bold py-3 rounded-full flex items-center justify-center gap-2 text-[15px] tracking-tight shadow-sm">
          <ShoppingCart size={18} /> Comprar
        </button>
        <button onClick={() => { setSelectedItem(HOME_ITEM); if (!authed) { setReturnTo("/chat"); navigate({ to: "/login" }); } else { navigate({ to: "/chat" }); } }} className="flex-1 bg-white border border-[#f28100] text-[#f28100] font-medium py-3 rounded-full flex items-center justify-center gap-2 text-[15px] tracking-tight hover:bg-[#fff5eb] transition">
          <MessageCircle size={18} /> Chat
        </button>
      </div>

      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between max-w-md mx-auto sticky top-0 z-50">
        <div className="flex items-center">
          <LogoOLX />
        </div>
        <div className="flex items-center gap-5 text-gray-700">
          <button onClick={() => handleFavClick(HOME_ID)} aria-label="Favoritar">
            <Heart size={22} className={isFavorite(HOME_ID) ? "text-[#e62117]" : "text-gray-700"} fill={isFavorite(HOME_ID) ? "#e62117" : "none"} />
          </button>
        </div>
      </div>

      <div className="relative bg-gradient-to-b from-gray-100 to-gray-50 aspect-[4/3] w-full max-w-md mx-auto overflow-hidden border-b border-gray-100">
        <div className="flex h-full transition-transform duration-300 ease-out" style={{ transform: `translateX(-${imgIdx * 100}%)` }}>
          {HOME_IMAGES.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label={`Ampliar imagem ${i + 1}`}
              className="w-full h-full shrink-0 flex items-center justify-center cursor-zoom-in"
            >
              <img
                src={src}
                alt={`${title} ${i + 1}`}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                loading={i === 0 ? "eager" : "lazy"}
                className="w-full h-full object-contain"
                draggable={false}
              />
            </button>
          ))}
        </div>
        {HOME_IMAGES.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => setImgIdx((i) => (i - 1 + HOME_IMAGES.length) % HOME_IMAGES.length)}
              aria-label="Imagem anterior"
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-95"
            >
              <ChevronLeft size={20} className="text-gray-800" />
            </button>
            <button
              type="button"
              onClick={() => setImgIdx((i) => (i + 1) % HOME_IMAGES.length)}
              aria-label="Próxima imagem"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/85 shadow flex items-center justify-center active:scale-95"
            >
              <ChevronRight size={20} className="text-gray-800" />
            </button>
          </>
        )}
        <div className="absolute top-4 right-4 px-2 py-1 bg-black/50 rounded-md text-white text-[11px] flex items-center gap-1">
          <Camera size={14} /> {imgIdx + 1}/{HOME_IMAGES.length}
        </div>
      </div>

      {lightboxOpen && <Suspense fallback={null}><Lightbox images={HOME_IMAGES} open={lightboxOpen} initialIndex={imgIdx} onClose={() => setLightboxOpen(false)} alt={title} /></Suspense>}


      <div className="max-w-md mx-auto bg-white p-4 shadow-sm">
        <p className="text-[#8c8c8c] text-xs mb-1 font-normal font-sans tracking-tight">{postedLabel}{locationLabel && !/em\s+/i.test(postedLabel) ? ` em ${locationLabel}` : ""}</p>
        <h1 className="text-[20px] font-medium text-[#1c1c1c] mb-4 tracking-tight leading-tight">{title}</h1>

        <div className="flex flex-wrap gap-2 mb-6">
          <span className="bg-[#e7f9ee] text-[#2e8b57] px-2 py-1 rounded-md text-[12px] font-medium flex items-center gap-1">
            <Truck size={14} /> Frete grátis
          </span>
          <span className="bg-[#f1f0ff] text-[#6e0ad6] px-2 py-1 rounded-md text-[12px] font-medium flex items-center gap-1">
            <LockIcon size={13} /> Pague Online
          </span>
          <span className="bg-[#f1f0ff] text-[#6e0ad6] px-2 py-1 rounded-md text-[12px] font-medium flex items-center gap-1">
            <CreditCard size={13} /> Parcelamento sem juros
          </span>
          <span className="bg-[#f1f0ff] text-[#6e0ad6] px-2 py-1 rounded-md text-[12px] font-medium flex items-center gap-1">
            <Shield size={13} /> Garantia da OLX
          </span>
        </div>

        <div className="mb-4">
          <h2 className="text-[44px] font-bold text-[#1c1c1c] leading-none mb-3 tracking-tighter">{priceLabel}</h2>

          <div className="flex items-center gap-1.5 mt-2 mb-2 flex-wrap">
            <div className="w-7 h-7 bg-[#32BCAD] rounded-full flex items-center justify-center shrink-0">
              <span className="text-white font-black text-[8px]">Pix</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => { setSelectedItem(HOME_ITEM); if (!authed) { setReturnTo("/chat"); navigate({ to: "/login" }); } else { navigate({ to: "/chat" }); } }}
            className="flex items-center gap-2 mt-3 text-[#6e0ad6] font-medium text-[14px]"
          >
            <HandCoins size={18} />
            Fazer oferta
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto bg-white p-4 border-t border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-normal text-[#1c1c1c] text-sm">Calcule o frete</h3>
          <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer" className="text-[#6e0ad6] text-[13px] font-medium">Não sei meu CEP</a>
        </div>
        <div className="border-b border-gray-200 pb-1">
          <input
            type="text"
            inputMode="numeric"
            value={cep}
            onChange={(e) => handleCepChange(e.target.value)}
            placeholder="Digite o CEP para ver o frete"
            className="w-full text-base placeholder:text-[#8c8c8c] focus:outline-none py-1"
          />
        </div>
        {cepLoading && (
          <p className="text-xs text-gray-500 mt-2">Buscando endereço...</p>
        )}
        {cepResult && !cepResult.erro && (
          <div className="mt-3 p-3 rounded-lg bg-[#f1ecff] border border-[#d6bbff]">
            <p className="text-sm text-gray-800 font-medium">
              {cepResult.logradouro ? `${cepResult.logradouro}, ` : ""}
              {cepResult.bairro ? `${cepResult.bairro} - ` : ""}
              {cepResult.localidade}/{cepResult.uf}
            </p>
            <p className="text-sm font-bold text-[#2e8b57] mt-1 flex items-center gap-1">
              <Truck size={14} /> Frete GRÁTIS por conta da OLX!
            </p>
            <p className="text-[12px] text-[#2e8b57] font-medium mt-0.5">Chega hoje mesmo na sua casa 🚀</p>
          </div>
        )}
        {cepResult?.erro && (
          <p className="text-xs text-red-600 mt-2">CEP não encontrado. Verifique e tente novamente.</p>
        )}
      </div>

      {/* CTA agora é fixo no rodapé */}

      {chatOpen && <Suspense fallback={null}><ChatWidget open={chatOpen} onClose={() => setChatOpen(false)} sellerName={sellerName} listingTitle={title} /></Suspense>}

      <div className="max-w-md mx-auto bg-white mt-1 p-4 pt-6 border-t border-gray-100">
        <h3 className="font-bold text-[#1c1c1c] mb-6 text-xl tracking-tight leading-none">Localização</h3>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#f0ebff] rounded-full flex items-center justify-center overflow-hidden">
            <div className="relative">
              <div className="w-10 h-10 border-2 border-[#6e0ad6] rounded-sm bg-white relative">
                <div className="absolute inset-x-0 top-1 h-0.5 bg-[#6e0ad6]/20"></div>
                <div className="absolute inset-x-0 top-3 h-0.5 bg-[#6e0ad6]/20"></div>
                <div className="absolute inset-x-0 top-5 h-0.5 bg-[#6e0ad6]/20"></div>
                <div className="absolute left-1/2 bottom-0 w-2 h-3 bg-[#6e0ad6] -translate-x-1/2"></div>
              </div>
              <div className="absolute -bottom-1 -right-2 w-6 h-6 bg-white border border-[#6e0ad6]/20 rounded-full flex items-center justify-center"><Layers size={10} className="text-[#6e0ad6]" /></div>
            </div>
          </div>
          <div>
            <p className="font-bold text-gray-800 text-lg leading-tight tracking-tight">{cityOnly}</p>
            <p className="text-sm text-gray-500 mt-1 font-medium tracking-tight leading-none">{ufOnly ? `${cityOnly}, ${ufOnly}` : cityOnly}</p>
          </div>
        </div>
      </div>

      {/* --- CARROSSEIS DE RECOMENDAÇÃO --- */}
      {(() => {
        const Card = ({ item }: { item: CarouselItem }) => {
          const fav = isFavorite(item.id);
          return (
            <Link to="/anuncio/$slug" params={{ slug: item.slug }} className="snap-start shrink-0 w-[33.333%] pr-2 block">
              <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
                {item.thumb ? <img src={item.thumb} alt={item.title} width={400} height={400} loading="eager" fetchPriority="high" decoding="async" className="w-full h-full object-cover" /> : null}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleFavClick(item.id); }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow"
                >
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
          <>
            {tambem.length > 0 && (
              <div className="max-w-md mx-auto mt-6 pl-4 border-t border-gray-200 pt-6">
                <h3 className="font-bold text-gray-800 mb-4 text-lg tracking-tight">Também podem te interessar</h3>
                <div className="flex overflow-x-auto snap-x snap-mandatory -mr-0 pb-2 scrollbar-hide">
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
          </>
        );
      })()}

      <div className="max-w-md mx-auto mt-4 px-4 border-t border-gray-200 pt-8">
        <h3 className="font-bold text-gray-800 mb-4 text-xl tracking-tight leading-tight">Sobre o anunciante</h3>
        <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
          <div className="bg-white p-4 rounded-xl border border-[#d6bbff] mb-6 relative shadow-sm">
            <div className="absolute top-3 right-3 text-gray-400 cursor-pointer"><X size={18} /></div>
            <div className="flex gap-1 mb-2">
              <div className="bg-gradient-to-r from-[#6e0ad6] to-[#f28100] px-2 py-0.5 rounded-full text-white text-[9px] font-black uppercase">Novo</div>
            </div>
            <p className="text-sm text-gray-800 font-medium leading-tight mb-2 tracking-tight">Esta conta passou por um processo de validação de identidade</p>
          </div>

          <div className="flex flex-col items-center mb-6">
            <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mb-1 tracking-tight uppercase leading-none">Conta verificada <VerifiedBadge size={14} /></p>
            <h4 className="text-xl font-bold text-gray-900 tracking-tight">{sellerName}</h4>
            <p className="text-[11px] text-gray-400 font-medium tracking-tight">Último acesso há 3 minutos</p>
          </div>

          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-tight font-sans">Nível: <span className="bg-[#e7f9ee] text-[#2e8b57] px-2 py-0.5 rounded-full flex items-center gap-1 font-black text-[10px] uppercase tracking-tighter"><Award size={10} /> Avançado</span></p>
            
          </div>
          <div className="flex gap-1 h-2 w-full mb-6 px-1">
            <div className="flex-1 bg-[#d1a3ff] rounded-full"></div>
            <div className="flex-1 bg-[#9c27b0] rounded-full"></div>
            <div className="flex-1 bg-[#6e0ad6] rounded-full shadow-inner"></div>
            <div className="flex-1 bg-[#f0f0f0] rounded-full"></div>
          </div>

          <div className="space-y-3 mb-8 px-1 text-gray-600 font-medium text-sm tracking-tight font-sans">
            <div className="flex items-center gap-3">
              <Layers size={18} className="text-gray-400" /> <p>{sellerSince}</p>
            </div>
            <div className="flex items-center gap-3">
              <MapPin size={18} className="text-gray-400" /> <p>{cityState}</p>
            </div>
          </div>


          <SalesHistory />

          <div className="border-t border-gray-100 pt-6 mt-6">
            <h5 className="font-bold text-gray-800 mb-5 text-base tracking-tight leading-none uppercase">Informações verificadas</h5>
            <div className="space-y-4 px-1 mb-6">
              {['E-mail', 'Telefone', 'Identidade', 'Facebook'].map(item => (
                <div key={item} className="flex items-center gap-3 text-[15px] font-normal text-gray-800 tracking-tight">
                  <VerifiedCheck /> {item}
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
              <p className="font-bold text-gray-800 text-base leading-none tracking-tight uppercase">Garantia da OLX</p>
              <p className="text-sm text-gray-500 leading-normal mt-1.5 font-medium tracking-tight">Pague online e receba o que comprou ou a OLX devolve seu dinheiro.</p>
              <button onClick={() => setShowGarantiaModal(true)} className="text-[#6e0ad6] text-sm font-bold underline mt-1 tracking-tight">Saiba mais</button>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="text-gray-800 mt-1"><Layers size={28} /></div>
            <div>
              <p className="font-bold text-gray-800 text-base leading-none tracking-tight uppercase">Pagamento via Pix</p>
              <p className="text-sm text-gray-500 leading-normal mt-1.5 font-medium tracking-tight">Pague de forma rápida e segura com aprovação na hora.</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <div className="text-gray-800 mt-1"><Truck size={28} /></div>
            <div>
              <p className="font-bold text-gray-800 text-base leading-none tracking-tight uppercase">Entrega fácil</p>
              <p className="text-sm text-gray-500 leading-normal mt-1.5 font-medium tracking-tight">Receba ou retire seu produto onde quiser com segurança.</p>
              <button onClick={() => setShowEntregaModal(true)} className="text-[#6e0ad6] text-sm font-bold underline mt-1 tracking-tight">Saiba mais</button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto mt-16 p-6 text-center space-y-10 border-t border-gray-100 pt-12">
        <div className="flex flex-col gap-5 font-bold text-gray-800 text-[15px] tracking-tighter leading-none uppercase">
          <a href="https://www.olx.com.br/faq.htm" target="_blank" rel="noopener noreferrer">Ajuda</a>
          <a href="https://dicas.olx.com.br/categoria/seguranca/?ic=prod-mkt&local=footer_web&campaign=dicas.seguranca&message=footer_web" target="_blank" rel="noopener noreferrer">Dicas de segurança</a>
          <a href="https://www.olx.com.br/copyright.htm" target="_blank" rel="noopener noreferrer">Termos de uso</a>
          <a href="https://ajuda.olx.com.br/s/article/politica-de-privacidade" target="_blank" rel="noopener noreferrer">Política de privacidade</a>
          <a href="https://ajuda.olx.com.br/s/article/protecao-a-propriedade" target="_blank" rel="noopener noreferrer">Propriedade intelectual</a>
          <a href="https://www.olx.com.br/mapa-do-site" target="_blank" rel="noopener noreferrer">Mapa do site</a>
          <a href="https://vemsergrupoolx.gupy.io/" target="_blank" rel="noopener noreferrer">Trabalhe conosco</a>
        </div>

        <div className="pt-8 border-t border-gray-200">
          <p className="text-[13px] text-gray-500 leading-relaxed font-medium tracking-tight px-4 italic font-sans uppercase">
            © Bom Negócio Atividades de Internet Ltda. - Rua do Catete, 359, Flamengo - 22220-001 - Rio de Janeiro, RJ
          </p>
        </div>

      </div>

      {showEntregaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowEntregaModal(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowEntregaModal(false)} className="absolute top-4 right-4 text-gray-600">
              <X size={22} />
            </button>
            <h3 className="text-lg font-bold text-gray-900 mb-6">Entrega fácil</h3>
            <div className="space-y-5">
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-full bg-[#f1ecff] flex items-center justify-center shrink-0">
                  <Truck size={22} className="text-[#6e0ad6]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-[15px] leading-tight">Receber o produto em casa</p>
                  <p className="text-sm text-gray-600 mt-1">Compre de qualquer lugar do Brasil e receba onde quiser.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-full bg-[#f1ecff] flex items-center justify-center shrink-0">
                  <ShoppingCart size={22} className="text-[#6e0ad6]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-[15px] leading-tight">Retirar com o vendedor</p>
                  <p className="text-sm text-gray-600 mt-1">Compre online e combine a retirada do produto pelo chat.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-full bg-[#f1ecff] flex items-center justify-center shrink-0">
                  <Layers size={22} className="text-[#6e0ad6]" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-[15px] leading-tight">Retirar no armário CliqueRetire</p>
                  <p className="text-sm text-gray-600 mt-1">Compre online e retire seu produto em um dos armários CliqueRetire disponíveis na sua região.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showGarantiaModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={() => setShowGarantiaModal(false)}>
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowGarantiaModal(false)} className="absolute top-4 right-4 text-gray-600">
              <X size={22} />
            </button>
            <div className="w-16 h-16 rounded-full bg-[#f1ecff] flex items-center justify-center mb-5">
              <Shield size={28} className="text-[#6e0ad6]" fill="#6e0ad6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 leading-tight">Receba o que comprou ou seu dinheiro de volta</h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-5">
              Com a garantia da OLX suas compras estão protegidas. Compre diretamente pelo app ou site, clicando no botão Comprar, e nós garantimos o reembolso do valor caso haja algum problema com a sua compra.
            </p>
            <p className="font-bold text-gray-900 text-sm mb-3">Situações de Cobertura</p>
            <ul className="space-y-2 mb-5 text-sm text-gray-700">
              <li className="flex items-start gap-2"><Check size={16} className="text-[#6e0ad6] mt-0.5 shrink-0" /> Produto diferente do anunciado</li>
              <li className="flex items-start gap-2"><Check size={16} className="text-[#6e0ad6] mt-0.5 shrink-0" /> Produto não recebido</li>
              <li>
                <div className="flex items-start gap-2"><Check size={16} className="text-[#6e0ad6] mt-0.5 shrink-0" /> Produto defeituoso</div>
                <p className="text-xs text-gray-500 ml-6 mt-1">Exceto nos casos de anúncios que explicitam essa condição.</p>
              </li>
            </ul>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
              Acesse "Preciso de ajuda" em "Detalhes da Compra" e nós resolveremos pra você.
            </div>
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
