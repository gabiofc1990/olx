import ip14pmRoxo1 from "@/assets/ip14pm-roxo-1.png";
import ip14pmRoxo2 from "@/assets/ip14pm-roxo-2.png";
import ip12Branco1 from "@/assets/ip12-branco-1.png";
import ip12Branco2 from "@/assets/ip12-branco-2.png";
import ip12Branco3 from "@/assets/ip12-branco-3.png";
import ip12Branco4 from "@/assets/ip12-branco-4.png";
import ip12Branco5 from "@/assets/ip12-branco-5.png";
import ip14Azul1 from "@/assets/ip14-128-azul-1.png";
import ip14Azul2 from "@/assets/ip14-128-azul-2.png";
import ipXsMax1 from "@/assets/ipxsmax-1.png";
import ipXsMax2 from "@/assets/ipxsmax-2.png";
import ip15pm1 from "@/assets/ip15pm-1.png";
import ip15pm2 from "@/assets/ip15pm-2.png";

export type CatalogItem = {
  id: string;
  img: string;
  images?: string[];
  title: string;
  price: string;
  date: string;
  local: string;
  installment: string;
  sales: number;
  stars: number;
  sellerName: string;
  sellerSince: string;
  locationFull: string;
  postedAt: string;
  description?: string;
};

const rand = (seed: number, min: number, max: number) => {
  // deterministic pseudo-random based on seed
  const x = Math.sin(seed * 9999) * 10000;
  const f = x - Math.floor(x);
  return Math.floor(min + f * (max - min + 1));
};

const raw = [
  // tambem
  { id: "ip13-128-itauna", img: "https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/iphone-13-128-itauna/1.png", images: [
      "https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/iphone-13-128-itauna/1.png",
      "https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/iphone-13-128-itauna/2.png",
      "https://vmiotmhyhebbwwncopcs.supabase.co/storage/v1/object/public/listing-images/iphone-13-128-itauna/3.png",
    ], title: "iPhone 13 128GB Branco - Seminovo", price: "R$ 1.690", installment: "10x sem juros de R$ 169,00", date: "Anunciado há 3 minutos em Itaúna, MG", local: "Itaúna - MG", locationFull: "Centro, Itaúna - MG", sellerName: "Jonatan", sellerSince: "Na OLX desde dezembro de 2022", postedAt: "Anunciado há 3 minutos em Itaúna, MG", description: "iPhone 13 em ótimo estado, sem nenhum arranhão ou qualquer detalhe! ✅\nO melhor preço da cidade 💰\n- Armazenamento de 128GB 💽\n- Acompanha película de brinde! 🎁\niPhone 13 128GB em perfeita condição." },
  { id: "ip14pm-128-roxo", img: ip14pmRoxo1, images: [ip14pmRoxo1, ip14pmRoxo2], title: "iPhone 14 Pro Max 128GB Roxo", price: "R$ 2.799", installment: "10x sem juros de R$ 279,90", date: "Anunciado há uma semana em Itaúna, MG", local: "Itaúna - MG", locationFull: "Centro, Itaúna - MG", sellerName: "Jonatan", sellerSince: "Na OLX desde dezembro de 2022", postedAt: "Anunciado há uma semana em Itaúna, MG", description: "Telefone muito bom\n128GB\nBateria 95%\nTodo ORIGINAL\n6 meses de GARANTIA L\nIPHONE 14 PRO MAX 128GB" },
  { id: "ip12-64-itauna", img: ip12Branco1, images: [ip12Branco1, ip12Branco2, ip12Branco3, ip12Branco4, ip12Branco5], title: "iPhone 12 64GB Branco", price: "R$ 1.150", installment: "10x sem juros de R$ 115,00", date: "Anunciado há 5 dias em Itaúna, MG", local: "Itaúna - MG", locationFull: "Centro, Itaúna - MG", sellerName: "Jonatan", sellerSince: "Na OLX desde dezembro de 2022", postedAt: "Anunciado há 5 dias em Itaúna, MG", description: "📲 iPhone 12\niPhone 12 - 64GB\nSaúde da bateria 75% Original\nFuncionando tudo!\niPhone 12 barato" },
  { id: "ip14p-256", img: "https://images.unsplash.com/photo-1574944985070-8f3ebc6b79d2?q=80&w=1000&auto=format&fit=crop", title: "iPhone 14 Plus 256GB", price: "R$ 3.900", installment: "10x sem juros de R$ 390,00", date: "08/04/2026, 09:15", local: "Belo Horizonte", locationFull: "Buritis, Belo Horizonte - MG", sellerName: "Paulo", sellerSince: "Na OLX desde maio de 2019", postedAt: "08/04 às 09:15" },
  { id: "ip11-64", img: "https://images.unsplash.com/photo-1556656793-08538906a9f8?q=80&w=1000&auto=format&fit=crop", title: "iPhone 11 64GB Branco", price: "R$ 1.450", installment: "10x sem juros de R$ 145,00", date: "05/04/2026, 14:00", local: "Betim", locationFull: "Centro, Betim - MG", sellerName: "Rafael", sellerSince: "Na OLX desde agosto de 2023", postedAt: "05/04 às 14:00" },
  { id: "ipxr-128", img: "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?q=80&w=1000&auto=format&fit=crop", title: "iPhone XR 128GB", price: "R$ 1.100", installment: "10x sem juros de R$ 110,00", date: "01/04/2026, 11:32", local: "Santa Luzia", locationFull: "São Benedito, Santa Luzia - MG", sellerName: "Bruno", sellerSince: "Na OLX desde outubro de 2022", postedAt: "01/04 às 11:32" },
  // mais
  { id: "ip14-128-itauna", img: ip14Azul1, images: [ip14Azul1, ip14Azul2], title: "iPhone 14 128GB Azul", price: "R$ 2.099", installment: "10x sem juros de R$ 209,90", date: "Anunciado há 2 semanas em Itaúna, MG", local: "Itaúna - MG", locationFull: "Centro, Itaúna - MG", sellerName: "Jonatan", sellerSince: "Na OLX desde dezembro de 2022", postedAt: "Anunciado há 2 semanas em Itaúna, MG", description: "Telefone muito NOVO\n128GB\nBateria 79%\nCondição: Usado — seminovo\nIPHONE 14 128GB" },
  { id: "ipxsmax-itauna", img: ipXsMax1, images: [ipXsMax1, ipXsMax2], title: "iPhone XS Max Itaúna - Bateria 100%", price: "R$ 800", installment: "10x sem juros de R$ 80,00", date: "Anunciado há 10 semanas em Itaúna, MG", local: "Itaúna - MG", locationFull: "Centro, Itaúna - MG", sellerName: "Jonatan", sellerSince: "Na OLX desde dezembro de 2022", postedAt: "Anunciado há 10 semanas em Itaúna, MG", description: "BARATO DEMAIS. iPhone ZERO sem arranhão. Bateria 100%. Funciona Face ID tudo ✅\nIMPECÁVEL ÚNICO DONO." },
  { id: "ip15pm-512-itauna", img: ip15pm1, images: [ip15pm1, ip15pm2], title: "iPhone 15 Pro Max 512GB", price: "R$ 3.100", installment: "10x sem juros de R$ 310,00", date: "Anunciado há 3 dias em Itaúna, MG", local: "Itaúna - MG", locationFull: "Centro, Itaúna - MG", sellerName: "Jonatan", sellerSince: "Na OLX desde dezembro de 2022", postedAt: "Anunciado há 3 dias em Itaúna, MG", description: "iPhone 15 Pro Max\nCondição: Novo\n512GB\n91% Bateria" },
  { id: "motoedge30", img: "https://images.unsplash.com/photo-1592899677977-9c10ca588bbd?q=80&w=1000&auto=format&fit=crop", title: "Motorola Edge 30", price: "R$ 1.500", installment: "10x sem juros de R$ 150,00", date: "3/05/2026, 18:40", local: "Betim - MG", locationFull: "Centro, Betim - MG", sellerName: "Diego", sellerSince: "Na OLX desde setembro de 2022", postedAt: "03/05 às 18:40" },
  { id: "sgs22", img: "https://images.unsplash.com/photo-1585060544812-6b45742d762f?q=80&w=1000&auto=format&fit=crop", title: "Samsung Galaxy S22", price: "R$ 2.700", installment: "10x sem juros de R$ 270,00", date: "2/05/2026, 12:10", local: "Contagem - MG", locationFull: "Eldorado, Contagem - MG", sellerName: "Tiago", sellerSince: "Na OLX desde novembro de 2020", postedAt: "02/05 às 12:10" },
  { id: "ipse2022", img: "https://images.unsplash.com/photo-1567581935884-3349723552ca?q=80&w=1000&auto=format&fit=crop", title: "iPhone SE 2022", price: "R$ 1.800", installment: "10x sem juros de R$ 180,00", date: "1/05/2026, 08:25", local: "BH - MG", locationFull: "Centro, Belo Horizonte - MG", sellerName: "Vinícius", sellerSince: "Na OLX desde dezembro de 2023", postedAt: "01/05 às 08:25" },
];

export const CATALOG: CatalogItem[] = raw.map((it, i) => ({
  ...it,
  sales: rand(i + 1, 30, 180),
  stars: rand(i + 7, 4, 5),
}));

export const TAMBEM_IDS = raw.slice(0, 6).map(r => r.id);
export const MAIS_IDS = raw.slice(6).map(r => r.id);

export const getItem = (id: string) => CATALOG.find(c => c.id === id);
