export const EMPTY = [0, 0, 0, 0, 0, 0];
export const number = value => Number(value || 0).toLocaleString();
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validFeed(data) {
  if (data?.version !== 1 || !Number.isInteger(data.observedAt) || !['running','offline'].includes(data.service) || !Array.isArray(data.profiles) || !Array.isArray(data.pool) || !data.market || !data.history) return false;
  return Object.entries(data.market).every(([id, modes]) => /^\d+$/.test(id) && Array.isArray(modes) && modes.length === 2 && modes.every(row => row.length === 6 && row.every(n => Number.isSafeInteger(n) && n >= 0))) &&
    Object.values(data.history).every(modes => Array.isArray(modes) && modes.length === 2 && modes.every(rows => Array.isArray(rows) && rows.length <= 10 && rows.every(row => row.length === 2 && row.every(n => Number.isSafeInteger(n) && n >= 0))));
}
export function freshness(feed, now = Date.now()/1000) {
  if (!feed) return 'error';
  if (feed.service === 'offline') return 'offline';
  if (feed.observedAt > now + 60 || now - feed.observedAt > 360) return 'stale';
  return 'running';
}
export function marketIndex(feed) {
  return {pool: new Set(feed?.pool || []), rotation: new Set((feed?.profiles || []).flatMap(p => p.items))};
}
export function itemState(item, feed, mode, index = marketIndex(feed)) {
  if (item[5]) return item[5] === 'Unverified category' ? 'unverified' : 'never';
  if (!feed) return 'unknown';
  if ((feed.market[item[0]]?.[mode] || EMPTY)[0]) return 'available';
  if (!index.pool.has(item[0])) return 'outside';
  return 'empty';
}
export function filteredItems(items, categories, feed, options) {
  const {query='', category='', status='all', mode=0, sort='name'} = options;
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const exactId = /^\d+$/.test(query.trim()) ? Number(query.trim()) : null;
  const index = marketIndex(feed);
  const rows = items.filter(item => {
    const path = categories[item[2]] || [];
    const state = itemState(item, feed, mode, index);
    const market = feed?.market[item[0]]?.[mode] || EMPTY;
    if (category === 'never' && !['never','unverified'].includes(state)) return false;
    const location = path.join(' / ');
    if (category && category !== 'never' && location !== category && !location.startsWith(category+' / ')) return false;
    if (mode === 1 && item[3] < 2) return false;
    const text = `${item[0]} ${item[1]} ${path.join(' ')}`.toLowerCase();
    if (exactId !== null ? item[0] !== exactId : !tokens.every(token => text.includes(token))) return false;
    if (status === 'all' && item[5]) return false;
    if (['available','empty','outside','never'].includes(status) && state !== status) return false;
    if (status === 'rotation' && (!index.rotation.has(item[0]) || item[5])) return false;
    if (status === 'sold' && !market[1]) return false;
    return true;
  });
  const field = {stock:0, sold:1, recent:3}[sort];
  rows.sort((a,b) => {
    if (sort === 'level' && a[4] !== b[4]) return a[4]-b[4];
    if (field !== undefined) {
      const d = (feed?.market[b[0]]?.[mode]?.[field] || 0) - (feed?.market[a[0]]?.[mode]?.[field] || 0);
      if (d) return d;
    }
    return a[1].localeCompare(b[1]) || a[0]-b[0];
  });
  return rows;
}
