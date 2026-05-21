// Snapshot of the product the visitor clicked "Comprar" on.
// Used to carry product info from any listing page into login/checkout.

export type SelectedItem = {
  listingId?: string;
  title: string;
  sellerName: string;
  priceCents: number;
  image: string;
  sellerSales?: number;
  sourcePath?: string;
  selectedAt?: number;
};

const ITEM_KEY = "olx_selected_item";
const CEP_KEY = "olx_cep";
const RETURN_KEY = "olx_return_to";
const WELCOME_KEY = "olx_show_welcome";
const ITEM_TTL_MS = 6 * 60 * 60 * 1000;

export function setReturnTo(path: string) { try { sessionStorage.setItem(RETURN_KEY, path); } catch {} }
export function consumeReturnTo(): string {
  try { const v = sessionStorage.getItem(RETURN_KEY) || "/"; sessionStorage.removeItem(RETURN_KEY); return v; } catch { return "/"; }
}
export function flagWelcome() { try { sessionStorage.setItem(WELCOME_KEY, "1"); } catch {} }
export function consumeWelcome(): boolean {
  try { const v = sessionStorage.getItem(WELCOME_KEY); if (v) { sessionStorage.removeItem(WELCOME_KEY); return true; } return false; } catch { return false; }
}

function isFresh(item: SelectedItem) {
  return !item.selectedAt || Date.now() - item.selectedAt < ITEM_TTL_MS;
}

export function setSelectedItem(item: SelectedItem) {
  const next = { ...item, selectedAt: Date.now() };
  try { sessionStorage.setItem(ITEM_KEY, JSON.stringify(next)); } catch {}
  try { localStorage.setItem(ITEM_KEY, JSON.stringify(next)); } catch {}
}
export function getSelectedItem(): SelectedItem | null {
  const read = (storage: Storage) => {
    const raw = storage.getItem(ITEM_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SelectedItem;
    if (isFresh(parsed)) return parsed;
    storage.removeItem(ITEM_KEY);
    return null;
  };
  try { return read(sessionStorage) ?? read(localStorage); } catch { return null; }
}

export function clearSelectedItem() {
  try { sessionStorage.removeItem(ITEM_KEY); } catch {}
  try { localStorage.removeItem(ITEM_KEY); } catch {}
}

export function setSelectedCep(cep: string) {
  try { sessionStorage.setItem(CEP_KEY, cep); } catch {}
}
export function getSelectedCep(): string {
  try { return sessionStorage.getItem(CEP_KEY) ?? ""; } catch { return ""; }
}

export function isFakeAuthed(): boolean {
  try { return localStorage.getItem("olx_fake_auth") === "1"; } catch { return false; }
}

// Parse "R$ 6.500" / "R$ 1.200,50" → 650000 / 120050
export function priceStringToCents(s: string): number {
  if (!s) return 0;
  const cleaned = s.replace(/[^\d,]/g, "");
  const [intPart, decPart = ""] = cleaned.split(",");
  const cents = parseInt(intPart || "0", 10) * 100 + parseInt((decPart + "00").slice(0, 2), 10);
  return isNaN(cents) ? 0 : cents;
}
