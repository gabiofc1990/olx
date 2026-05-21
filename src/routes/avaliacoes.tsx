import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Menu, MessageCircle, Bell, Star, ChevronLeft } from "lucide-react";
import { REVIEWS, AVG_RATING, TOTAL_REVIEWS } from "@/lib/reviews";

export const Route = createFileRoute("/avaliacoes")({
  component: AvaliacoesPage,
  head: () => ({
    meta: [
      { title: "Avaliações do vendedor — OLX" },
      { name: "description", content: "Veja as avaliações recebidas pelo vendedor na OLX." },
    ],
  }),
});

function LogoOLX() {
  return (
    <div className="flex items-end font-black text-[26px] tracking-tighter leading-none">
      <span className="text-[#6e0ad6]">o</span>
      <span className="text-[#6e0ad6]">l</span>
      <span className="text-[#f28100]">x</span>
    </div>
  );
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? "text-[#ffb600]" : "text-gray-300"}
          fill="currentColor"
        />
      ))}
    </div>
  );
}

function AvaliacoesPage() {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? REVIEWS : REVIEWS.slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans text-[#1c1c1c]">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between max-w-md mx-auto sticky top-0 z-10">
        <div className="flex items-center gap-3 text-gray-800">
          <Link to="/" className="text-gray-700"><Menu size={22} /></Link>
          <LogoOLX />
        </div>
        <div className="flex items-center gap-4 text-gray-700">
          <MessageCircle size={22} />
          <Bell size={22} />
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-4">
        <Link to="/" className="inline-flex items-center text-sm text-[#6e0ad6] font-medium">
          <ChevronLeft size={16} /> Voltar
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center shadow-sm">
          <p className="text-3xl font-bold text-gray-900">{AVG_RATING.toString().replace(".", ",")}</p>
          <div className="my-2"><Stars value={AVG_RATING} size={26} /></div>
          <p className="text-sm text-gray-500">{TOTAL_REVIEWS} avaliações</p>
        </div>

        <h2 className="text-[15px] font-bold text-gray-900 pt-2">Avaliações recebidas como vendedor</h2>

        {visible.map((r, idx) => (
          <article key={idx} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="mb-2"><Stars value={r.rating} size={16} /></div>
            {r.text && <p className="text-sm text-gray-800 leading-snug mb-3">{r.text}</p>}
            <p className="text-xs text-[#6e0ad6] font-medium mb-3">
              Produto vendido: {r.product}
            </p>
            <div className="border-t border-gray-100 pt-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-3.3 0-10 1.7-10 5v3h20v-3c0-3.3-6.7-5-10-5Z"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-none">{r.name}</p>
                <p className="text-xs text-gray-500 mt-1">{r.date}</p>
              </div>
            </div>
          </article>
        ))}

        {!showAll && REVIEWS.length > 3 && (
          <button
            onClick={() => setShowAll(true)}
            className="w-full bg-white border border-[#6e0ad6] text-[#6e0ad6] font-bold py-3 rounded-full text-[14px] hover:bg-[#f6efff] transition"
          >
            Ver mais avaliações ({REVIEWS.length - 3})
          </button>
        )}
        {showAll && (
          <button
            onClick={() => setShowAll(false)}
            className="w-full text-[#6e0ad6] font-bold py-3 text-[14px]"
          >
            Mostrar menos
          </button>
        )}
      </main>
    </div>
  );
}
