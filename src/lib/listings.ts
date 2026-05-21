import { supabase } from "@/integrations/supabase/client";

export type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  price_cents: number;
  installment_label: string | null;
  category: string | null;
  brand: string | null;
  model: string | null;
  condition: string | null;
  storage_capacity: string | null;
  color: string | null;
  location_text: string | null;
  seller_name: string | null;
  seller_since: string | null;
  seller_sales: number | null;
  shipping_label: string | null;
  is_main: boolean;
  carousel_section: string;
  display_order: number;
  published: boolean;
  posted_at: string | null;
};

export type ListingImage = { id: string; listing_id: string; url: string; display_order: number };

export const formatBRL = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export async function fetchMainListing() {
  const { data } = await supabase.from("listings").select("*").eq("is_main", true).eq("published", true).limit(1).maybeSingle();
  return data as Listing | null;
}
export async function fetchListingBySlug(slug: string) {
  const { data } = await supabase.from("listings").select("*").eq("slug", slug).eq("published", true).maybeSingle();
  return data as Listing | null;
}
export async function fetchListingImages(listingId: string) {
  const { data } = await supabase.from("listing_images").select("*").eq("listing_id", listingId).order("display_order");
  return (data ?? []) as ListingImage[];
}
export async function fetchCarousel(section: string, limit = 20) {
  const { data } = await supabase.from("listings").select("*").eq("carousel_section", section).eq("published", true).eq("is_main", false).order("display_order").limit(limit);
  return (data ?? []) as Listing[];
}
const toThumb = (url: string) => url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/") + "?width=400&quality=70";
export type CarouselItem = Listing & { thumb: string };
export async function fetchAllOtherListings(excludeId: string, limit = 50) {
  const { data } = await supabase.from("listings").select("*").eq("published", true).neq("id", excludeId).order("display_order").limit(limit);
  return (data ?? []) as Listing[];
}
export async function fetchAllOtherListingsWithThumbs(excludeId: string, limit = 50): Promise<CarouselItem[]> {
  const items = await fetchAllOtherListings(excludeId, limit);
  if (!items.length) return [];
  const ids = items.map(i => i.id);
  const { data: imgs } = await supabase.from("listing_images").select("listing_id,url,display_order").in("listing_id", ids).order("display_order");
  const byId: Record<string, string> = {};
  (imgs ?? []).forEach((img: any) => { if (!byId[img.listing_id]) byId[img.listing_id] = img.url; });
  return items.map(i => ({ ...i, thumb: byId[i.id] ? toThumb(byId[i.id]) : "" }));
}
export async function fetchCarouselWithThumbs(section: string, limit = 20): Promise<CarouselItem[]> {
  const items = await fetchCarousel(section, limit);
  if (!items.length) return [];
  const ids = items.map(i => i.id);
  const { data: imgs } = await supabase.from("listing_images").select("listing_id,url,display_order").in("listing_id", ids).order("display_order");
  const byId: Record<string, string> = {};
  (imgs ?? []).forEach((img: any) => { if (!byId[img.listing_id]) byId[img.listing_id] = img.url; });
  return items.map(i => ({ ...i, thumb: byId[i.id] ? toThumb(byId[i.id]) : "" }));
}

export function splitUniqueCarousels(
  tambem: CarouselItem[],
  mais: CarouselItem[],
  excludeIds: string[] = [],
) {
  const seenIds = new Set(excludeIds.filter(Boolean));
  const seenSlugs = new Set<string>();

  const pick = (items: CarouselItem[]) => {
    const result: CarouselItem[] = [];
    for (const item of items) {
      if (seenIds.has(item.id) || seenSlugs.has(item.slug)) continue;
      seenIds.add(item.id);
      seenSlugs.add(item.slug);
      result.push(item);
    }
    return result;
  };

  return { tambem: pick(tambem), mais: pick(mais) };
}
