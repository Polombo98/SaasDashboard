export function toISODate(d: Date) { return d.toISOString().slice(0,10); }
export function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
export function qs(params: Record<string, string | undefined>) {
  const s = Object.entries(params).filter(([,v])=>v!=null && v!=='').map(([k,v])=>`${k}=${encodeURIComponent(v!)}`).join('&');
  return s ? `?${s}` : '';
}