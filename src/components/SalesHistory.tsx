import { Link } from "@tanstack/react-router";
import { Star, Ban, Truck } from "lucide-react";
import { AVG_RATING, TOTAL_REVIEWS, TOTAL_SALES, TOTAL_CANCELED, DISPATCH_TIME } from "@/lib/reviews";

function Stars({ value, size = 18 }: { value: number; size?: number }) {
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

function VerifiedCheck({ size = 22 }: { size?: number }) {
  return (
    <div className="border-2 border-[#4caf50] rounded-md grid place-items-center text-[#4caf50]" style={{ width: size, height: size }}>
      <svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}

type Props = { rating?: number; reviews?: number; sales?: number; canceled?: number; dispatch?: string };
export function SalesHistory({ rating = AVG_RATING, reviews = TOTAL_REVIEWS, sales = TOTAL_SALES, canceled = TOTAL_CANCELED, dispatch = DISPATCH_TIME }: Props = {}) {
  return (
    <div className="border-t border-gray-100 pt-6">
      <h5 className="font-bold text-gray-900 mb-4 text-[17px] tracking-tight">Histórico de vendas</h5>

      <div className="flex items-center gap-3 mb-1">
        <span className="text-[26px] font-bold text-gray-900 leading-none">{rating.toString().replace(".", ",")}</span>
        <Stars value={rating} size={20} />
      </div>
      <Link to="/avaliacoes" className="text-[#6e0ad6] text-[14px] font-medium block mb-6">
        Acessar {reviews} avaliações
      </Link>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <VerifiedCheck size={26} />
          <p className="text-[22px] font-bold text-gray-900 mt-2 leading-none">{String(sales).padStart(2, "0")}</p>
          <p className="text-[12px] text-gray-600 leading-tight mt-1">Vendas<br />concluídas</p>
        </div>
        <div>
          <Ban size={26} className="text-[#e53935]" strokeWidth={2.2} />
          <p className="text-[22px] font-bold text-gray-900 mt-2 leading-none">{String(canceled).padStart(2, "0")}</p>
          <p className="text-[12px] text-gray-600 leading-tight mt-1">Vendas<br />canceladas</p>
        </div>
        <div>
          <Truck size={26} className="text-gray-500" strokeWidth={1.8} />
          <p className="text-[18px] font-bold text-gray-900 mt-2 leading-none whitespace-nowrap">{dispatch}</p>
          <p className="text-[12px] text-gray-600 leading-tight mt-1">Tempo médio<br />de despacho</p>
        </div>
      </div>
    </div>
  );
}
