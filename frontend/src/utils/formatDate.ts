/**
 * API returns naive UTC datetimes as ISO strings without a Z suffix.
 * `new Date("2026-04-29T03:00:00")` is parsed as local time in browsers,
 * which shifts the clock by the user's offset vs UTC.
 */
export function formatApiDateTime(iso: string): string {
  const s = iso.trim();
  const hasZone =
    /[zZ]$/.test(s) || /[-+]\d{2}:?\d{2}$/.test(s) || /[-+]\d{2}$/.test(s);
  const looksIsoDateTime =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(s);
  const normalized =
    looksIsoDateTime && !hasZone ? `${s}Z` : s;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR");
}
