// World Route Finder: do not render every expansion at page load.
// The main renderer already filters by #route-expansion; this initializer removes
// the "All expansions" choice and starts with no expansion selected so only the
// user's chosen expansion creates zone cards (and therefore only those zones can
// start atlas enrichment).
(function(){
  const select=document.querySelector('#route-expansion');
  const root=document.querySelector('#world-route-root');
  if(!select||!root)return;

  const all=select.querySelector('option[value="all"]');
  if(all)all.remove();

  let prompt=select.querySelector('option[value=""]');
  if(!prompt){
    prompt=document.createElement('option');
    prompt.value='';
    prompt.textContent='Select an expansion…';
    prompt.disabled=true;
    select.insertBefore(prompt,select.firstChild);
  }

  select.value='';
  prompt.selected=true;
  select.dispatchEvent(new Event('change',{bubbles:true}));
  root.innerHTML='<p class="notice"><strong>Select an expansion above.</strong> Only zones from that expansion will be displayed and loaded.</p>';
})();
