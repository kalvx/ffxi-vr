// Keep the existing local Current Reality maps, but serve the wider Mappy atlas
// through jsDelivr so every zone card can show its actual map image reliably.
(function(){
  const maps=window.CR_ZONE_MAPS||{};
  const raw='https://raw.githubusercontent.com/khoa002/ffxi-mappy/master/Maps/';
  const cdn='https://cdn.jsdelivr.net/gh/khoa002/ffxi-mappy@master/Maps/';
  Object.values(maps).forEach(m=>{
    if(!m)return;
    if(Array.isArray(m.maps))m.maps=m.maps.map(u=>String(u).startsWith(raw)?String(u).replace(raw,cdn):u);
    if(m.remoteTemplate&&String(m.remoteTemplate).startsWith(raw))m.remoteTemplate=String(m.remoteTemplate).replace(raw,cdn);
  });
})();
