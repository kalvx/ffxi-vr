(function(){
  const overlay=document.querySelector('#atlas-loading');
  const select=document.querySelector('#route-expansion');
  const title=document.querySelector('#atlas-loading-title');
  const current=document.querySelector('#atlas-loading-current');
  const bar=document.querySelector('#atlas-loading-bar');
  const count=document.querySelector('#atlas-loading-count');
  if(!overlay||!select)return;
  let active=false,hideTimer=0;
  const paint=(percent,message,status)=>{bar.style.width=`${percent}%`;current.textContent=message;count.textContent=status};
  const show=()=>{clearTimeout(hideTimer);overlay.hidden=false;document.body.classList.add('atlas-is-loading')};
  const hide=()=>{hideTimer=setTimeout(()=>{overlay.hidden=true;document.body.classList.remove('atlas-is-loading')},700)};
  select.addEventListener('change',()=>{
    if(!select.value)return;
    active=true;const label=select.options[select.selectedIndex]?.textContent||'selected expansion';
    title.textContent=`Loading ${label}`;show();paint(3,'The page is rendering behind this overlay…','Preparing zone database queue…');
  });
  window.addEventListener('cr:atlas-progress',event=>{
    const d=event.detail||{};if(!active||d.expansion!==select.value)return;
    const total=Math.max(0,Number(d.total)||0),complete=Math.min(total,Math.max(0,Number(d.complete)||0));
    const working=d.status==='loading'?0.45:0;
    const percent=d.done?100:total?Math.min(98,Math.max(4,Math.round((complete+working)/total*100))):3;
    const message=d.current?`${d.status==='failed'?'Skipped unavailable data for':d.status==='loaded'?'Finished':'Loading'} ${d.current}…`:'Building zone panels and preparing the loading queue…';
    const status=total?`${complete} of ${total} zones complete • ${percent}%`:'Preparing zone database queue…';
    paint(percent,message,status);
    if(d.done){active=false;paint(100,'Every available map and data panel is ready.','Travel guide fully loaded • 100%');hide()}
  });
})();
