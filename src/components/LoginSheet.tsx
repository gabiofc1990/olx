import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

export function LoginSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md rounded-t-2xl p-6 pb-8 relative animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-700">
          <X size={22} />
        </button>
        <h3 className="text-[17px] font-bold text-gray-900 mb-3">Acesse a sua conta</h3>
        <p className="text-sm text-gray-700 leading-relaxed mb-6">
          Entre na OLX para adicionar anúncios aos seus favoritos e muito mais.
        </p>
        <Link
          to="/login"
          onClick={onClose}
          className="block w-full bg-[#f28100] hover:bg-[#e07700] text-white font-bold py-3.5 rounded-full text-center text-base shadow-sm"
        >
          Entrar
        </Link>
        <p className="text-center text-sm text-gray-700 mt-4">
          Não tem uma conta?{" "}
          <Link to="/login" onClick={onClose} className="text-[#6e0ad6] font-bold">Cadastre-se</Link>
        </p>
      </div>
    </div>
  );
}
