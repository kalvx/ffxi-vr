(() => {
  const scriptUrl = new URL(document.currentScript.src);
  const assetBase = new URL('.', scriptUrl);
  const siteBase = new URL('../', assetBase);
  const shards = new Map();
  let card;
  let activeLink;
  let hideTimer;
  let touchedLink;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);

  async function recordFor(id) {
    const shard = Math.floor(Number(id) / 256);
    if (!shards.has(shard)) {
      shards.set(shard, fetch(new URL(`data/item-sources/${shard}.json`, assetBase)).then((response) => {
        if (!response.ok) throw new Error(`Item reference ${response.status}`);
        return response.json();
      }));
    }
    const records = await shards.get(shard);
    return records[String(id)];
  }

  function obtainSummary(sources = {}) {
    const vendor = sources.vendors?.[0];
    if (vendor) return `Sold by ${vendor.name} in ${vendor.zone}${vendor.price != null ? ` for ${Number(vendor.price).toLocaleString()} gil` : ''}.`;
    const drop = sources.drops?.[0];
    if (drop) return `Dropped by ${drop.monster} in ${drop.zone} (${drop.rate}% recorded rate).`;
    if (sources.craftedBy?.length) return 'Produced by crafting; open the full entry for its recipe.';
    if (sources.quests?.length) return `Involved in ${sources.quests[0].quest}.`;
    return 'No direct vendor, monster, craft, or quest source is recorded in the current dataset.';
  }

  function ensureCard() {
    if (card) return card;
    card = document.createElement('aside');
    card.className = 'item-popover';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-live', 'polite');
    card.hidden = true;
    card.addEventListener('mouseenter', () => clearTimeout(hideTimer));
    card.addEventListener('mouseleave', scheduleHide);
    document.body.append(card);
    return card;
  }

  function positionCard(link) {
    const box = link.getBoundingClientRect();
    const panel = ensureCard();
    const left = Math.min(Math.max(12, box.left), window.innerWidth - panel.offsetWidth - 12);
    const below = box.bottom + 10;
    const top = below + panel.offsetHeight < window.innerHeight ? below : Math.max(12, box.top - panel.offsetHeight - 10);
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  async function show(link) {
    clearTimeout(hideTimer);
    activeLink = link;
    const panel = ensureCard();
    panel.hidden = false;
    panel.innerHTML = '<p class="item-popover-loading">Loading item…</p>';
    positionCard(link);
    try {
      const record = await recordFor(link.dataset.itemId);
      if (activeLink !== link || !record) return;
      const item = record.item || {};
      const ah = record.ah?.listed ? record.ah.path.join(' → ') : 'Not sold through the Auction House';
      const type = record.ah?.listed ? record.ah.path.at(-1) : (item.weapon?.skill || item.kind || 'Item');
      panel.innerHTML = `<p class="item-popover-kicker">${escapeHtml(type)} · Item ${escapeHtml(item.id)}</p><h3>${escapeHtml(item.name || link.textContent)}</h3><p>Stack ${escapeHtml(item.stack ?? '—')} · Base vendor value ${Number(item.sell || 0).toLocaleString()} gil</p><dl><dt>Auction House</dt><dd>${escapeHtml(ah)}</dd><dt>Obtain</dt><dd>${escapeHtml(obtainSummary(record.sources))}</dd></dl><a href="${new URL(`reference/index.html?item=${item.id}`, siteBase)}">View full item entry</a>`;
      positionCard(link);
    } catch (error) {
      panel.innerHTML = `<p>Item details could not be loaded.</p>`;
    }
  }

  function hide() {
    if (card) card.hidden = true;
    activeLink = null;
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 180);
  }

  document.addEventListener('mouseover', (event) => {
    const link = event.target.closest('[data-item-id]');
    if (link) show(link);
  });
  document.addEventListener('mouseout', (event) => {
    if (event.target.closest('[data-item-id]')) scheduleHide();
  });
  document.addEventListener('focusin', (event) => {
    const link = event.target.closest('[data-item-id]');
    if (link) show(link);
  });
  document.addEventListener('focusout', (event) => {
    if (event.target.closest('[data-item-id]')) scheduleHide();
  });
  document.addEventListener('pointerdown', (event) => {
    touchedLink = event.pointerType === 'touch' ? event.target.closest('[data-item-id]') : null;
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-item-id]');
    if (!link || touchedLink !== link) return;
    if (activeLink !== link || card?.hidden) {
      event.preventDefault();
      show(link);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') hide();
  });
})();
