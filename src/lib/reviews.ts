export type Review = {
  rating: number;
  product: string;
  text: string;
  name: string;
  date: string;
};

// 20 avaliações realistas, top 3 com as melhores copys
export const REVIEWS: Review[] = [
  // Top 3 (melhores copys, sempre exibidos primeiro no resumo)
  {
    rating: 5,
    product: "iPhone 14 Pro 256GB",
    text: "Vendedor excepcional! Aparelho chegou lacrado, exatamente como descrito, embalagem caprichada e entrega super rápida. Recomendo de olhos fechados, parceiro de verdade.",
    name: "Larissa M.",
    date: "12 de abril de 2026",
  },
  {
    rating: 5,
    product: "iPhone 13 128GB Azul",
    text: "Top demais! Comunicação rápida, tirou todas as minhas dúvidas e o iPhone veio impecável, bateria 100%. Já é o segundo que compro com ele e nunca decepciona.",
    name: "Rafael S.",
    date: "03 de abril de 2026",
  },
  {
    rating: 5,
    product: "iPhone 15 Pro Max 512GB",
    text: "Melhor compra que fiz na OLX. Vendedor honesto, paciente, respondeu tudo no chat e enviou no mesmo dia. Aparelho zero arranhão. Nota mil!",
    name: "Camila R.",
    date: "27 de março de 2026",
  },
  // Demais
  { rating: 5, product: "iPhone 12 Pro Max 256GB", text: "Tudo certo, produto conforme anunciado. Entrega no prazo e bem embalado.", name: "Bruno H.", date: "20 de março de 2026" },
  { rating: 5, product: "iPhone 11 128GB", text: "Aparelho perfeito, bateria excelente. Atendimento muito atencioso.", name: "Patrícia L.", date: "14 de março de 2026" },
  { rating: 4, product: "AirPods Pro 2", text: "Produto original e novo. Demorou 1 dia a mais que o combinado, mas no geral foi ótimo.", name: "Diego F.", date: "08 de março de 2026" },
  { rating: 5, product: "iPhone 14 128GB Roxo", text: "Vendedor sério, mandou nota fiscal e tudo direitinho. Super recomendo.", name: "Juliana T.", date: "01 de março de 2026" },
  { rating: 5, product: "iPhone 13 Mini", text: "Negociação tranquila, aparelho impecável. Já estou indicando para amigos.", name: "Marcelo V.", date: "22 de fevereiro de 2026" },
  { rating: 5, product: "Apple Watch Series 9", text: "Chegou rapidinho, lacrado. Excelente vendedor, pode confiar.", name: "Aline G.", date: "15 de fevereiro de 2026" },
  { rating: 5, product: "iPhone 15 128GB", text: "Comprei à noite e no outro dia já estava em casa. Tudo perfeito!", name: "Lucas P.", date: "08 de fevereiro de 2026" },
  { rating: 4, product: "iPhone 12 64GB", text: "Aparelho bem cuidado e bateria boa. Atendimento ótimo no chat.", name: "Renata C.", date: "30 de janeiro de 2026" },
  { rating: 5, product: "iPhone 14 Pro 128GB", text: "Negociei o preço, ele aceitou e enviou super rápido. Vendedor de confiança!", name: "Felipe A.", date: "21 de janeiro de 2026" },
  { rating: 5, product: "iPhone 13 Pro 256GB", text: "Excelente experiência. Produto exatamente como nas fotos.", name: "Tatiane O.", date: "15 de janeiro de 2026" },
  { rating: 5, product: "iPhone 11 Pro 64GB", text: "Vendedor parceiro, tirou todas as dúvidas. Recomendo demais!", name: "Gustavo B.", date: "08 de janeiro de 2026" },
  { rating: 4, product: "iPhone XR 128GB", text: "Aparelho ok, conforme descrito. Embalagem poderia ser melhor.", name: "Simone K.", date: "28 de dezembro de 2025" },
  { rating: 5, product: "iPhone 15 Pro 256GB", text: "Top, top, top! Já comprei outras vezes e sempre satisfeito.", name: "André M.", date: "20 de dezembro de 2025" },
  { rating: 5, product: "iPad Air 5", text: "Produto novo, lacrado, com nota. Vendedor extremamente educado.", name: "Beatriz N.", date: "12 de dezembro de 2025" },
  { rating: 5, product: "iPhone 14 Plus", text: "Adorei a compra. Comunicação rápida e entrega ágil.", name: "Vinícius L.", date: "05 de dezembro de 2025" },
  { rating: 5, product: "Apple Watch SE 2", text: "Tudo certo, aparelho em estado de novo. Recomendo.", name: "Carolina E.", date: "27 de novembro de 2025" },
  { rating: 4, product: "iPhone 13 256GB", text: "Bom vendedor, produto chegou bem. Só achei que o frete demorou um pouco.", name: "Eduardo Q.", date: "18 de novembro de 2025" },
];

export const TOTAL_REVIEWS = REVIEWS.length;
export const TOTAL_SALES = 6; // alinhado ao print: 06 vendas concluídas
export const TOTAL_CANCELED = 0;
export const DISPATCH_TIME = "45min – 3h";

// Média ponderada arredondada a 1 casa
export const AVG_RATING = (() => {
  const sum = REVIEWS.reduce((a, r) => a + r.rating, 0);
  return Math.round((sum / REVIEWS.length) * 10) / 10;
})();
