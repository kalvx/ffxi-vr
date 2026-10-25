import {EMPTY, number, escape as esc, validFeed, freshness, marketIndex, itemState, filteredItems} from './model.js?v=2';

const endpoint = 'https://raw.githubusercontent.com/kalvx/ffxi-vr/auction-live/latest.json';
const $ = id => document.getElementById(id);
const state = {catalog:null, feed:null, category:'', page:1, selected:null, failed:false};
const labels = {available:'In stock', empty:'Out of stock', outside:'Outside automated catalog', never:'Never on AH', unverified:'Unverified category', unknown:'Awaiting market'};
const dates = stamp => new Date(stamp*1000).toLocaleString(undefined, {month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'});
const mode = () => Number($('mode').value);
const options = () => ({query:$('search').value, category:state.category, status:$('status').value, mode:mode(), sort:$('sort').value});
function updateAddress() {
  const url = new URL(location.href);
  for (const [key,value] of Object.entries({category:state.category,q:$('search').value,show:$('status').value,mode:mode(),sort:$('sort').value,item:state.selected || ''})) {
    if (value && value !== 'all' && value !== 'name') url.searchParams.set(key,value);
    else url.searchParams.delete(key);
  }
  history.replaceState(null,'',url);
}
function drawFeedState() {
  const value = freshness(state.feed);
  if (!state.feed && !state.failed) {
    document.querySelector('.ah-feed').dataset.state='loading';
    $('feed-state').textContent='Connecting to market…';
    $('feed-time').textContent='Loading auction inventory.';
    return;
  }
  document.querySelector('.ah-feed').dataset.state = state.failed ? 'error' : value;
  $('feed-state').textContent = state.failed ? 'Refresh unavailable · last snapshot' : {running:'Market updating',stale:'Updates delayed · snapshot is stale',offline:'Auction system offline · last snapshot',error:'Market data unavailable'}[value];
  $('feed-time').textContent = state.feed ? `Inventory as of ${dates(state.feed.observedAt)} · checks every 2 minutes${value === 'running' ? '' : ' · quantities are last observed'}` : 'Inventory counts will appear when the market feed is available.';
}
function drawCategories() {
  const roots = new Map();
  for (const path of Object.values(state.catalog.categories)) {
    let branch = roots;
    for (const part of path) {if (!branch.has(part)) branch.set(part,new Map()); branch=branch.get(part);}
  }
  const order = ['Weapons','Armor','Scrolls','Medicines','Furnishings','Materials','Food','Crystals','Others'];
  const button = (label,path) => `<button type="button" data-category="${esc(path)}" aria-current="${state.category===path}">${esc(label)}</button>`;
  function branch(nodes, prefix=[]) {
    return [...nodes].map(([label, children]) => {
      const path = [...prefix,label]; const value=path.join(' / ');
      return children.size ? `<details${state.category.startsWith(value) ? ' open' : ''}><summary>${esc(label)}</summary><div>${button('All '+label,value)}${branch(children,path)}</div></details>` : button(label,value);
    }).join('');
  }
  const sorted = new Map([...roots].sort((a,b)=>order.indexOf(a[0])-order.indexOf(b[0])));
  $('categories').innerHTML = button('All Items','') + branch(sorted) + button('Never on Auction House','never');
}
function drawSummary() {
  if (!state.feed) {$('summary').textContent=`${number(state.catalog.items.length)} items · waiting for inventory`;return;}
  let listings=0, sold=0, stocked=0;
  for (const modes of Object.values(state.feed.market)) {
    listings+=modes[0][0]+modes[1][0];sold+=modes[0][1]+modes[1][1];
    if (modes[0][0]+modes[1][0]) stocked++;
  }
  const current=freshness(state.feed)==='running'&&!state.failed;
  const summary = [[stocked,current?'items in stock':'items last stocked'],[listings,current?'listings':'last observed listings'],[sold,current?'sales · last 24h':'sales · 24h before snapshot'],[marketIndex(state.feed).rotation.size,current?'items in rotation':'items in last rotation']];
  $('summary').innerHTML=summary.map(([n,label])=>`<span><strong>${number(n)}</strong>${label}</span>`).join('');
}
function drawTable() {
  if (!state.catalog) return;
  drawFeedState();drawSummary();
  const rows=filteredItems(state.catalog.items,state.catalog.categories,state.feed,options());
  const size=Number($('page-size').value), pages=Math.max(1,Math.ceil(rows.length/size));
  state.page=Math.max(1,Math.min(state.page,pages));
  const start=(state.page-1)*size, visible=rows.slice(start,start+size), index=marketIndex(state.feed);
  const current=freshness(state.feed)==='running' && !state.failed;
  $('category-title').textContent=state.category==='never'?'Never on Auction House':state.category || 'All Items';
  $('item-count').textContent=`${number(rows.length)} items · ${mode()?'Stacks':'Singles'}`;
  $('stock-heading').textContent=`${current?'Stock':'Last stock'} [${mode()?'stacks':'singles'}]`;
  $('items').innerHTML=visible.map(item=>{
    const [id,name,category,stack,level,reason]=item, market=state.feed?.market[id]?.[mode()] || EMPTY;
    const kind=itemState(item,state.feed,mode(),index), rotated=index.rotation.has(id), cls=kind==='unverified'?'outside':kind;
    const price=market[2] ? `${number(market[2])}<small>${esc(dates(market[3]))}</small>` : market[5] ? `${number(market[5])}<small>Reference · no completed sale</small>` : '—';
    const count=state.feed && !reason ? `[${number(market[0])}]` : '—';
    return `<tr data-selected="${state.selected===id}"><td><button type="button" class="ah-item" data-history="${id}"><span class="item-icon-frame item-icon-small" data-item-icon="${id}" aria-hidden="true"></span><span>${esc(name)}${mode()?` <small>Stack of ${stack}</small>`:''}</span></button></td><td>${level||'—'}</td><td>${esc((state.catalog.categories[category]||[]).join(' › ')||'—')}</td><td class="ah-number ${market[0]?'ah-stock':'ah-zero'}">${count}</td><td>${state.feed && !reason ? number(market[1]) : '—'}</td><td class="ah-price">${price}</td><td><span class="${cls}" title="${esc(reason || labels[kind])}">${kind==='never'?'⊘ ':kind==='available'?'● ':'○ '}${current || kind==='never' || kind==='unverified' || kind==='unknown' ? '' : 'Last seen: '}${labels[kind]}</span>${rotated && !reason?'<small class="rotation">◆ Current rotation</small>':''}</td></tr>`;
  }).join('') || '<tr><td colspan="7" class="ah-empty">No items match. Change the category or filters.</td></tr>';
  $('page-info').textContent=rows.length ? `${number(start+1)}–${number(Math.min(start+size,rows.length))} of ${number(rows.length)} · Page ${state.page} / ${number(pages)}` : '0 items';
  $('page-number').value=state.page;$('page-number').max=pages;
  $('previous').disabled=state.page<=1;$('next').disabled=state.page>=pages;
  updateAddress();
}
function drawHistory(focus=false) {
  const item=state.catalog.items.find(item=>item[0]===state.selected);
  if (!item) {$('history').hidden=true;return;}
  const m=mode(), records=state.feed?.history[item[0]]?.[m] || [], values=state.feed?.market[item[0]]?.[m] || EMPTY;
  const profiles=(state.feed?.profiles || []).filter(p=>p.items.includes(item[0])).map(p=>p.name);
  $('history').innerHTML=`<header><div><h2 id="history-title">Price History · ${esc(item[1])}</h2><p>${m?`Stack of ${item[3]}`:'Single item'} · Item ${item[0]}${profiles.length?' · Rotation: '+esc(profiles.join(', ')):''}</p></div><button type="button" data-close-history aria-label="Close Price History">×</button></header><div class="ah-history-modes"><button type="button" data-history-mode="0" aria-pressed="${m===0}">Singles</button><button type="button" data-history-mode="1" aria-pressed="${m===1}"${item[3]<2?' disabled':''}>Stacks${item[3]>1?' · '+item[3]:''}</button></div>${records.length?`<table><thead><tr><th scope="col">Date</th><th scope="col">Quantity</th><th scope="col">Sale price · gil</th></tr></thead><tbody>${records.map(([stamp,price])=>`<tr><td>${esc(dates(stamp))}</td><td>${m?item[3]:1}</td><td>${number(price)}</td></tr>`).join('')}</tbody></table><p>Latest ${records.length} retained completed sales · ${number(values[4])} retained in total. Automated purchases are included.</p>`:`<p>${state.feed?'No completed sales retained for this quantity.':'Price History is unavailable until the market feed connects.'}</p>`}${values[5]?`<p>Seeded market reference: ${number(values[5])} gil per ${m?'stack':'single'}. This is not a completed sale.</p>`:''}<p><a class="item-link" data-item-id="${item[0]}" href="../reference/index.html?item=${item[0]}">Item details ↗</a></p>`;
  $('history').hidden=false;
  if (focus) {$('history').setAttribute('tabindex','-1');$('history').focus({preventScroll:true});$('history').scrollIntoView({behavior:'smooth',block:'nearest'});}
}
let refreshing=false;
async function refresh() {
  if (refreshing) return;
  refreshing=true;$('refresh').disabled=true;
  try {
    const response=await fetch(endpoint+'?t='+Math.floor(Date.now()/120000),{cache:'no-store',signal:AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error('Market feed '+response.status);
    const data=await response.json();
    if (!validFeed(data)) throw new Error('Invalid market feed');
    if (state.feed && data.observedAt<state.feed.observedAt) throw new Error('Older cached market feed');
    state.feed=data;state.failed=false;
    try {localStorage.setItem('cr-auction-snapshot-v1',JSON.stringify(data));}catch{}
  } catch {state.failed=true;}
  finally {refreshing=false;$('refresh').disabled=false;drawTable();drawHistory();}
}
async function init() {
  try {
    const response=await fetch('catalog.json');
    if (!response.ok) throw new Error('Item catalog unavailable');
    state.catalog=await response.json();
    try {const saved=JSON.parse(localStorage.getItem('cr-auction-snapshot-v1'));if(validFeed(saved))state.feed=saved;}catch{}
    const params=new URLSearchParams(location.search);
    for (const [key,id] of [['q','search'],['show','status'],['mode','mode'],['sort','sort']]) {
      if (!params.has(key)) continue;
      const value=params.get(key), control=$(id);
      if (control.tagName==='INPUT' || [...control.options].some(o=>o.value===value)) control.value=value;
    }
    const requested=params.get('category')||'';
    if(requested==='never'||Object.values(state.catalog.categories).some(p=>p.join(' / ').startsWith(requested)))state.category=requested;
    state.selected=Number(params.get('item'))||null;
    drawCategories();drawTable();drawHistory();
    $('filters').addEventListener('submit',event=>event.preventDefault());
    $('filters').addEventListener('input',()=>{state.page=1;drawTable();drawHistory();});
    $('categories').addEventListener('click',event=>{
      const button=event.target.closest('[data-category]');if(!button)return;
      state.category=button.dataset.category;state.page=1;
      $('status').value=state.category==='never'?'every':'all';
      drawCategories();drawTable();
    });
    $('items').addEventListener('click',event=>{const button=event.target.closest('[data-history]');if(!button)return;state.selected=Number(button.dataset.history);drawTable();drawHistory(true);});
    $('history').addEventListener('click',event=>{
      const button=event.target.closest('button');if(!button)return;
      if(button.hasAttribute('data-close-history')) {state.selected=null;drawHistory();updateAddress();}
      else if(button.dataset.historyMode!==undefined) {$('mode').value=button.dataset.historyMode;state.page=1;drawTable();drawHistory();}
    });
    $('previous').addEventListener('click',()=>{state.page--;drawTable();});
    $('next').addEventListener('click',()=>{state.page++;drawTable();});
    $('page-number').addEventListener('change',()=>{state.page=Number($('page-number').value)||1;drawTable();});
    $('refresh').addEventListener('click',refresh);
    await refresh();
    setInterval(()=>{if(!document.hidden)refresh();},120000);
    setInterval(drawFeedState,15000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  } catch {
    $('feed-state').textContent='Auction catalog unavailable';
    $('feed-time').textContent='Reload the page to retry.';
    $('items').innerHTML='<tr><td colspan="7" class="ah-empty">The item catalog could not be loaded.</td></tr>';
  }
}
init();
