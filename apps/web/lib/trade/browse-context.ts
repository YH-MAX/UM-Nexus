// Only browsing preferences are stored here, never listings or account data.
type BrowsePosition = { scrollY: number; count: number };
const prefix = "um-nexus:browse:";
export function readBrowsePosition(url: string): BrowsePosition {
  try {
    const value = JSON.parse(sessionStorage.getItem(prefix + url) ?? "null");
    return {
      scrollY: Number.isFinite(value?.scrollY) ? Math.max(0, value.scrollY) : 0,
      count: Number.isFinite(value?.count) ? Math.min(2400, Math.max(24, value.count)) : 24,
    };
  } catch { return { scrollY: 0, count: 24 }; }
}
export function saveBrowsePosition(url: string, position: BrowsePosition) {
  try {
    sessionStorage.setItem(prefix + url, JSON.stringify(position));
    sessionStorage.setItem("um-nexus:last-browse", url);
  } catch { /* Browsing remains available when storage is blocked. */ }
}
export function lastBrowseUrl(): string {
  try {
    const url = sessionStorage.getItem("um-nexus:last-browse") ?? "/trade";
    return /^\/trade(?:\/explore)?(?:\?[^#]*)?$/.test(url) ? url : "/trade";
  } catch { return "/trade"; }
}
