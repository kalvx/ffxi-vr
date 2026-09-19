(function(){
  const overlay=document.querySelector('#atlas-loading');
  const select=document.querySelector('#route-expansion');
  const root=document.querySelector('#world-route-root');
  const title=document.querySelector('#atlas-loading-title');
  const current=document.querySelector('#atlas-loading-current');
  const bar=document.querySelector('#atlas-loading-bar');
  const count=document.querySelector('#atlas-loading-count');
  if(!overlay||!select||!root)return;
  let batch=0,hideTimer=0;
  const paint=(percent,message,status)=>{bar.style.width=`${percent}%`;current.textContent=message;count.textContent=status};
  const show=()=>{clearTimeout(hideTimer);overlay.hidden=false;document.body.classList.add('atlas-is-loading')};
  const hide=()=>{hideTimer=setTimeout(()=>{overlay.hidden=true;document.body.classList.remove('atlas-is-loading')},420)};
  select.addEventListener('change',()=>{
    if(!select.value)return;
    const run=++batch,label=select.options[select.selectedIndex]?.textContent||'selected expansion';
    title.textContent=`Loading ${label}`;show();paint(12,'Preparing expansion layout…','Building zone panels…');
    requestAnimationFrame(()=>{if(run!==batch)return;paint(42,'Building maps and route panels…','Preparing world atlas…');
      requestAnimationFrame(()=>{if(run!==batch)return;const zones=root.querySelectorAll('.route-card').length;paint(76,'Finalizing maps and panels…',zones?`${zones} zone panels prepared`:'Finalizing selected expansion…');
        setTimeout(()=>{if(run!==batch)return;const ready=root.querySelectorAll('.route-card').length;paint(100,'Travel guide ready. Mob, NPC and drop details will continue loading inside each panel.',`${ready} zone panels ready • 100%`);hide()},260);
      });
    });
  });
})();
