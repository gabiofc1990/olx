import badgeImg from "@/assets/verified-badge.png";

export function VerifiedBadge({ size = 16, className = "" }: { size?: number; className?: string }) {
  return <img src={badgeImg} alt="Verificado" width={size} height={size} className={`inline-block shrink-0 ${className}`} style={{ width: size, height: size }} />;
}
