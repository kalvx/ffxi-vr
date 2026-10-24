const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let sharedCatalog;

export function candidateRows(sources, monsters) {
  const rows = [...(sources.drops || [])];
  for (const rule of sources.dropRules || []) {
    for (const monster of monsters) {
      if (monster.levelMax < rule.minimumLevel || (rule.element && monster.element !== rule.element)) continue;
      rows.push({...monster, levelMin: Math.max(monster.levelMin, rule.minimumLevel),
        source:'shared', note:`Shared ${rule.kind} drop · conditions above apply.`});
    }
  }
  return rows.sort((a, b) => a.zone.localeCompare(b.zone) || a.monster.localeCompare(b.monster) || a.levelMin - b.levelMin);
}

export async function enrichRecord(record) {
  if (!record?.sources?.dropRules?.length || record.sources.monsterRows) return record;
  try {
    if (!sharedCatalog) sharedCatalog = fetch(new URL('data/shared-monster-drops.json?v=20261024-drops1', import.meta.url))
      .then(response => { if (!response.ok) throw new Error(`Monster sources ${response.status}`); return response.json(); })
      .catch(error => { sharedCatalog = null; throw error; });
    const catalog = await sharedCatalog;
    return {...record, sources:{...record.sources, monsterRows:candidateRows(record.sources, catalog.monsters)}};
  } catch {
    return {...record, sources:{...record.sources, monsterSourceError:true}};
  }
}

export function sourceRows(sources) {
  return sources.monsterRows || sources.drops || [];
}

export function filterRows(rows, query) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(row => words.every(word => `${row.monster} ${row.zone}`.toLocaleLowerCase().includes(word)));
}

export function rowMarkup(row) {
  const level = row.levelMax > 0 ? ` · Lv. ${row.levelMin}${row.levelMax !== row.levelMin ? `–${row.levelMax}` : ''}` : '';
  return `<article><strong>${escapeHtml(row.monster)}</strong><span>${escapeHtml(row.zone)}${level}</span>${row.rate != null ? `<small>${escapeHtml(row.rateLabel || 'Base chance per loot roll')}: ${escapeHtml(row.rate)}%</small>` : ''}${row.note ? `<small>${escapeHtml(row.note)}</small>` : ''}</article>`;
}

export function renderDropSection(sources) {
  const rows = sourceRows(sources), rules = sources.dropRules || [];
  return `<section data-monster-sources><h3>Monster drops</h3>${rules.map(rule => `<p class="monster-source-note">${escapeHtml(rule.description)}</p><p class="monster-source-note">${escapeHtml(rule.rateNote)}</p>`).join('')}${rules.length ? '<p class="monster-source-note">Listed monsters are spawn candidates. Their level and loot eligibility when defeated must meet these conditions.</p>' : ''}${rows.some(row => row.source === 'table') ? '<p class="monster-source-note">Loot-table percentages are base chances per roll. Server drop bonuses and Treasure Hunter can change these chances.</p>' : ''}${sources.monsterSourceError ? '<p class="empty">The shared monster list could not load. The drop rule above still applies; reload to try the list again.</p>' : ''}${rows.length ? `<label class="monster-source-search">Search monsters or zones<input type="search" data-monster-search placeholder="e.g. Kuftal Tunnel" autocomplete="off"></label><p data-monster-count aria-live="polite"></p><div class="item-source-list" data-monster-rows>${rows.slice(0, 40).map(rowMarkup).join('')}</div><button type="button" data-monster-more>Show more monsters</button>` : (!rules.length ? '<p class="empty">No monster drop has been indexed for this item.</p>' : '')}</section>`;
}

export function bindDropSection(panel, sources) {
  const section = panel.querySelector('[data-monster-sources]');
  if (!section || !sourceRows(sources).length) return;
  const search = section.querySelector('[data-monster-search]'), more = section.querySelector('[data-monster-more]');
  const list = section.querySelector('[data-monster-rows]'), count = section.querySelector('[data-monster-count]');
  let limit = 40;
  const render = () => {
    const rows = filterRows(sourceRows(sources), search.value), shown = Math.min(limit, rows.length);
    list.innerHTML = rows.slice(0, shown).map(rowMarkup).join('') || '<p class="empty">No monsters match this search.</p>';
    count.textContent = `Showing ${shown.toLocaleString()} of ${rows.length.toLocaleString()} monster sources`;
    more.hidden = shown >= rows.length;
  };
  search.addEventListener('input', () => { limit = 40; render(); });
  more.addEventListener('click', () => { limit += 40; render(); });
  render();
}
