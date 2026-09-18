(function(){
  const overlay=document.querySelector('#atlas-loading');
  const select=document.querySelector('#route-expansion');
  const title=document.querySelector('#atlas-loading-title');
  const current=document.querySelector('#atlas-loading-current');
  const bar=document.querySelector('#atlas-loading-bar');
  const count=document.querySelector('#atlas-loading-count');
  if(!overlay||!select)return;
  let hideTimer=0;
  const show=()=>{clearTimeout(hideTimer);overlay.hidden=false;document.body.classList.add('atlas-is-loading')};
  const hide=()=>{hideTimer=setTimeout(()=>{overlay.hidden=true;document.body.classList.remove('atlas-is-loading')},360)};
  select.addEventListener('change',()=>{
    if(!select.value)return;
    const label=select.options[select.selectedIndex]?.textContent||'selected expansion';
    title.textContent=`Loading ${label}`;
    current.textContent='Building zone panels in the background…';
    bar.style.width='0%';count.textContent='Preparing zone queue…';show();
  });
  window.addEventListener('cr:atlas-progress',event=>{
    const d=event.detail||{};if(d.expansion!==select.value)return;show();
    const total=Math.max(0,Number(d.total)||0),complete=Math.min(total,Math.max(0,Number(d.complete)||0));
    const percent=total?Math.round(complete/total*100):0;
    bar.style.width=`${percent}%`;
    count.textContent=total?`${complete} of ${total} zones ready • ${percent}%`:'Preparing zone queue…';
    current.textContent=d.current?`${d.status==='failed'?'Continuing past':'Loading'} ${d.current}…`:'Finalizing maps and panels…';
    if(d.done){bar.style.width='100%';count.textContent=`${total} of ${total} zones ready • 100%`;current.textContent='Travel guide ready.';hide()}
  });
})();
