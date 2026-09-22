(() => {
  const scriptUrl = new URL(document.currentScript.src);
  const spriteBase = new URL('item-icons/', scriptUrl);
  let indexPromise;

  function loadIndex() {
    if (!indexPromise) {
      indexPromise = fetch(new URL('index.json', spriteBase), { cache: 'force-cache' })
        .then((response) => {
          if (!response.ok) throw new Error(`Item icon index ${response.status}`);
          return response.json();
        })
        .catch(() => null);
    }
    return indexPromise;
  }

  async function decorate(root = document) {
    const nodes = [...root.querySelectorAll?.('[data-item-icon]:not([data-item-icon-ready])') || []];
    if (!nodes.length) return;
    nodes.forEach((node) => { node.dataset.itemIconReady = 'pending'; });
    const index = await loadIndex();
    if (!index?.items) {
      nodes.forEach((node) => { delete node.dataset.itemIconReady; });
      return;
    }
    const size = Number(index.iconSize) || 32;
    nodes.forEach((node) => {
      const entry = index.items[String(node.dataset.itemIcon)];
      if (!entry) { node.dataset.itemIconReady = 'missing'; return; }
      const [sheet, col, row] = entry;
      node.style.backgroundImage = `url("${new URL(`${sheet}.png`, spriteBase)}")`;
      node.style.backgroundPosition = `${-Number(col) * size}px ${-Number(row) * size}px`;
      node.style.backgroundSize = `${(Number(index.cols) || 16) * size}px auto`;
      node.classList.add('item-icon-ready');
      node.dataset.itemIconReady = '1';
    });
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) decorate(node.matches?.('[data-item-icon]') ? node.parentElement : node);
    }));
  });
  function start() {
    decorate();
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.CR_ITEM_ICONS = { decorate };
})();
