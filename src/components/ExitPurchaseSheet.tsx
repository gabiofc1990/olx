import { X } from "lucide-react";
import exitIcon from "@/assets/exit-purchase-icon.png";

export function ExitPurchaseSheet({
  onClose,
  onLeave,
}: {
  onClose: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-t-2xl p-6 pb-8 animate-in slide-in-from-bottom duration-300">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-700">
          <X size={22} />
        </button>
        <div className="flex flex-col items-center text-center pt-2">
          <img src={exitIcon} alt="" className="w-16 h-16 object-contain mb-3" />
          <h2 className="text-[18px] font-bold text-[#1c1c1c] mb-2">
            Deseja desistir da compra?
          </h2>
          <p className="text-[14px] text-gray-600 leading-snug mb-6 px-4">
            Ao fechar este fluxo outra pessoa poderá comprar este produto!
          </p>
          <button
            onClick={onClose}
            className="w-full bg-[#f28100] text-white font-bold py-3.5 rounded-full text-[15px] mb-3"
          >
            Continuar a compra
          </button>
          <button onClick={onLeave} className="text-[#6e0ad6] font-bold text-[14px]">
            Fechar e desistir
          </button>
        </div>
      </div>
    </div>
  );
}
