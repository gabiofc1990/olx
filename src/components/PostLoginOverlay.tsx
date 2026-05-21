import { Shield, BadgeCheck, Truck } from "lucide-react";
import { useState } from "react";

export function PostLoginOverlay({ onClose }: { onClose: () => void }) {
  const [dontShow, setDontShow] = useState(false);

  const handle = () => {
    if (dontShow) {
      try { localStorage.setItem("olx_hide_welcome", "1"); } catch {}
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-end px-6 pb-8 backdrop-blur-md bg-black/55">
      <div className="flex-1 flex items-center justify-center w-full max-w-md">
        <div className="text-white w-full">
          <h3 className="text-center text-[26px] font-extrabold leading-tight mb-8">
            Compra<br />100% protegida!
          </h3>
          <div className="space-y-6 px-2">
            <div className="flex items-start gap-4">
              <Shield size={30} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[17px] leading-tight">Pagamento seguro</p>
                <p className="text-sm text-white/80 mt-0.5">Pague pelo App e proteja seu dinheiro.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <BadgeCheck size={30} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[17px] leading-tight">Garantia de entrega</p>
                <p className="text-sm text-white/80 mt-0.5">O vendedor só recebe após sua confirmação.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Truck size={30} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[17px] leading-tight">Proteção total</p>
                <p className="text-sm text-white/80 mt-0.5">Cobertura para o produto e o frete.</p>
              </div>
            </div>
          </div>
          <div className="mt-10 flex justify-center">
            <span className="bg-white text-[#6e0ad6] text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1 border border-[#d6bbff]">
              <span>💲</span> Garantia da OLX
            </span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md space-y-4">
        <label className="flex items-center justify-center gap-2 text-white text-sm">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
            className="w-4 h-4 accent-white"
          />
          Não mostrar essa dica novamente
        </label>
        <button
          onClick={handle}
          className="w-full bg-white text-gray-900 font-bold py-3.5 rounded-full text-base shadow-sm"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
