const KEY = "olx_favorites";

function read(): string[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
function write(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new Event("olx_favorites_changed"));
  } catch {}
}

export function isFavorite(id: string): boolean {
  return read().includes(id);
}
export function toggleFavorite(id: string): boolean {
  const cur = read();
  const i = cur.indexOf(id);
  if (i >= 0) { cur.splice(i, 1); write(cur); return false; }
  cur.push(id); write(cur); return true;
}
export function getFavorites(): string[] { return read(); }
