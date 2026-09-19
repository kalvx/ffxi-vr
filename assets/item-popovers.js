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
  const slotNames = { 1:'Main',2:'Sub',4:'Ranged',8:'Ammo',16:'Head',32:'Body',64:'Hands',128:'Legs',256:'Feet',512:'Neck',1024:'Waist',2048:'Left Ear',4096:'Right Ear',8192:'Left Ring',16384:'Right Ring',32768:'Back' };
  const jobCodes = ['WAR','MNK','WHM','BLM','RDM','THF','PLD','DRK','BST','BRD','RNG','SAM','NIN','DRG','SMN','BLU','COR','PUP','DNC','SCH','GEO','RUN'];
  const equipSlots = (mask = 0) => Object.entries(slotNames).filter(([bit]) => mask & Number(bit)).map(([, name]) => name).join(' / ') || '—';
  const equipJobs = (mask = 0) => jobCodes.filter((job, index) => mask & (1 << index)).join(' · ') || '—';

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

  function statusBadges(record = {}) {
    const flags = Number(record.flags || 0), sources = record.sources || {}, badges = [];
    if (flags & 0x8000) badges.push(['rare', 'Rare']);
    if (flags & 0x4000) badges.push(['exclusive', 'Exclusive']);
    if (record.ah?.listed) badges.push(['buy', 'Auction House']);
    if (sources.vendors?.length) badges.push(['buy', 'NPC Vendor']);
    if (sources.drops?.length) badges.push(['find', 'Monster Drop']);
    if (sources.craftedBy?.length) badges.push(['craft', 'Crafted']);
    if (sources.quests?.length || sources.guideUses?.length) badges.push(['quest', 'Quest']);
    if (!badges.length) badges.push(['unknown', 'Source Unrecorded']);
    return badges.map(([kind, label]) => `<span class="item-badge ${kind}">${label}</span>`).join('');
  }

  function sourceDetails(record = {}) {
    const sources = record.sources || {}, details = [];
    if (record.ah?.listed) details.push(`Purchasable: Auction House · ${record.ah.path.join(' → ')}`);
    sources.vendors?.slice(0, 2).forEach((vendor) => details.push(`Vendor: ${vendor.name} · ${vendor.zone}${vendor.price != null ? ` · ${Number(vendor.price).toLocaleString()} gil` : ''}`));
    sources.drops?.slice(0, 2).forEach((drop) => details.push(`Drop: ${drop.monster} · ${drop.zone}${drop.rate != null ? ` · ${drop.rate}%` : ''}`));
    if (sources.craftedBy?.length) details.push(`Craftable: ${sources.craftedBy.length} recorded recipe${sources.craftedBy.length === 1 ? '' : 's'}`);
    sources.quests?.slice(0, 2).forEach((quest) => details.push(`Quest: ${quest.quest} · ${quest.area}`));
    sources.guideUses?.slice(0, 1).forEach((guide) => details.push(`Guide: ${guide.title}`));
    return details.length ? details.map(escapeHtml).join('<br>') : escapeHtml(obtainSummary(sources));
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
      const equipRows = item.equip ? `<dt>Equip</dt><dd>${escapeHtml(equipSlots(item.equip.slot))} · Level ${escapeHtml(item.equip.level)}${item.equip.ilevel ? ` · iLvl ${escapeHtml(item.equip.ilevel)}` : ''}</dd><dt>Jobs</dt><dd class="item-popover-jobs">${escapeHtml(equipJobs(item.equip.jobs))}</dd>` : '';
      const weaponRows = item.weapon ? `<dt>Weapon</dt><dd>${escapeHtml(item.weapon.skill)} · ${escapeHtml(item.weapon.damage)} DMG · ${escapeHtml(item.weapon.delay)} delay${item.weapon.hits > 1 ? ` · ${escapeHtml(item.weapon.hits)} hits` : ''}</dd>` : '';
      panel.innerHTML = `<p class="item-popover-kicker">${escapeHtml(type)} · Item ${escapeHtml(item.id)}</p><h3>${escapeHtml(item.name || link.textContent)}</h3><div class="item-popover-badges">${statusBadges(record)}</div><p>${escapeHtml(item.kind || 'Item')} · Stack ${escapeHtml(item.stack ?? '—')} · Base vendor value ${Number(item.sell || 0).toLocaleString()} gil</p><dl><dt>Type</dt><dd>${escapeHtml(type)}</dd>${equipRows}${weaponRows}<dt>Auction House</dt><dd>${escapeHtml(ah)}</dd><dt>Find it</dt><dd>${sourceDetails(record)}</dd></dl><a href="${new URL(`reference/index.html?item=${item.id}`, siteBase)}">View full item entry</a>`;
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
