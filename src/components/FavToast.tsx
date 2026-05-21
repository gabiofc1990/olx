import { Heart } from "lucide-react";

export function FavToast({ show, added }: { show: boolean; added: boolean }) {
  return (
    <div
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-[80] transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-[#1f1f1f] text-white px-4 py-3 flex items-center gap-2 shadow-lg">
        <Heart size={18} className="text-[#e62117]" fill="#e62117" />
        <span className="text-sm font-medium">
          {added ? "Adicionado aos favoritos." : "Removido dos favoritos."}
        </span>
      </div>
    </div>
  );
}
