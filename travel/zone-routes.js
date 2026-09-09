(function(){
  const data=window.CR_WORLD_ROUTES||[];
  const details=window.CR_ROUTE_DETAILS||{};
  const root=document.querySelector('#world-route-root');
  const search=document.querySelector('#route-search');
  const type=document.querySelector('#route-expansion');
  if(!root)return;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const routeCard=(zone)=>{
    const d=details[zone];
    if(!d){
      return `<article class="trust-card route-card route-unmapped" data-zone="${esc(zone.toLowerCase())}"><small>DESTINATION</small><h3>${esc(zone)}</h3><p>Listed in the Current Reality world directory. Detailed route notes are shown only when they are actually written into this Compendium.</p></article>`;
    }
    const routes=(d.routes||[]).map((r,i)=>`<details class="route-detail"><summary>${esc(r.name||`Route ${String.fromCharCode(65+i)}`)}</summary><ol class="guide-steps">${(r.steps||[]).map(s=>`<li>${esc(s)}</li>`).join('')}</ol></details>`).join('');
    const unlocks=d.unlocks?.length?`<p><strong>Unlock on the way:</strong> ${d.unlocks.map(esc).join(' • ')}</p>`:'';
    const hazards=d.hazards?`<p><strong>Hazards:</strong> ${esc(d.hazards)}</p>`:'';
    return `<article class="trust-card route-card" data-zone="${esc(zone.toLowerCase())}"><small>ROUTE MAPPED</small><h3>${esc(zone)}</h3>${d.access?`<p><strong>Access:</strong> ${esc(d.access)}</p>`:''}${d.protection?`<p><strong>Sneak / Invisible:</strong> ${esc(d.protection)}</p>`:''}${hazards}${routes}${unlocks}</article>`;
  };
  function render(){
    const q=(search?.value||'').trim().toLowerCase();
    const exp=type?.value||'all';
    let html='';
    data.forEach(group=>{
      if(exp!=='all'&&group.id!==exp)return;
      const regions=[];
      group.regions.forEach(region=>{
        const zones=region.zones.filter(z=>!q||z.toLowerCase().includes(q)||region.name.toLowerCase().includes(q)||group.name.toLowerCase().includes(q));
        if(!zones.length)return;
        regions.push(`<details class="route-region"><summary><strong>${esc(region.name)}</strong> <span>${zones.length} destinations</span></summary><div class="trust-grid">${zones.map(routeCard).join('')}</div></details>`);
      });
      if(regions.length) html+=`<details class="route-expansion"><summary><h2>${esc(group.name)}</h2></summary>${regions.join('')}</details>`;
    });
    root.innerHTML=html||'<p class="notice">No matching destinations.</p>';
  }
  if(type){type.innerHTML='<option value="all">All expansions</option>'+data.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('');type.addEventListener('change',render)}
  search?.addEventListener('input',render);
  render();
})();
