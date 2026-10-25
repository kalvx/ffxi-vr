// Continue loading while the player browses cards or details.
(function(){
  const select=document.querySelector('#route-expansion');if(!select)return;
  let queue=[],running=0;const failed=new Set(),active=new Set(),field=window.CR_ZONE_FIELD_GUIDES;
  function names(){return window.CR_WORLD_ROUTES.filter(group=>select.value==='all'||group.id===select.value).flatMap(group=>group.regions.flatMap(region=>region.zones))}
  function progress(current='',status='loading'){
    const zones=names(),complete=zones.filter(zone=>field[zone]?.dbLoaded).length,errors=zones.filter(zone=>failed.has(zone)).length;
    window.dispatchEvent(new CustomEvent('cr:atlas-progress',{detail:{expansion:select.value,total:zones.length,complete,failed:errors,current,status,done:complete+errors>=zones.length}}));
  }
  function pump(){
    while(running<2&&queue.length){
      const zone=queue.shift(),area=window.CR_ATLAS_INDEX.areas[zone];
      if(field[zone]?.dbLoaded||active.has(zone)){progress();continue}
      active.add(zone);running++;progress(zone);
      window.CR_ZONE_DB.loadZone(area.zoneId,null,zone).then(data=>{
        window.CR_ATLAS.merge(zone,data);failed.delete(zone);progress(zone,'loaded');
      }).catch(()=>{failed.add(zone);window.CR_ATLAS.failed(zone);progress(zone,'failed')}).finally(()=>{running--;active.delete(zone);pump()});
    }
    if(!running&&!queue.length)progress('','loaded');
  }
  select.addEventListener('change',()=>{queue=names().filter(zone=>!field[zone]?.dbLoaded&&!active.has(zone));progress();pump()});
  document.querySelector('#atlas-retry')?.addEventListener('click',()=>{queue=names().filter(zone=>!field[zone]?.dbLoaded&&!active.has(zone));failed.clear();pump()});
})();
