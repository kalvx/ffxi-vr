(function(){
  const panel=document.querySelector('#atlas-loading'),title=document.querySelector('#atlas-loading-title'),current=document.querySelector('#atlas-loading-current'),bar=document.querySelector('#atlas-loading-bar'),count=document.querySelector('#atlas-loading-count');
  if(!panel)return;
  window.addEventListener('cr:atlas-progress',event=>{
    const d=event.detail||{};if(!d.total){panel.hidden=true;return}panel.hidden=false;
    title.textContent=d.done?(d.failed?'Some zone records need retry':'Atlas ready'):'Preparing selected areas';bar.style.width=Math.round(d.complete/d.total*100)+'%';
    count.textContent=`${d.complete} / ${d.total} zones ready${d.failed?' · '+d.failed+' need retry':''}`;
    current.textContent=d.done?(d.failed?'Some files could not load. Completed zones are retained.':'Zone records are cached for your next visit.'):(d.current?'Loading '+d.current+'…':'Loading zone records…');
    document.querySelector('#atlas-retry').hidden=!d.failed;
  });
})();
