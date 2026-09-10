// Keep the existing local Current Reality maps, but serve the wider Mappy atlas
// through jsDelivr so every zone card can show its actual map image reliably.
// Mappy's image files are case-sensitive and are stored with lowercase hex names
// (for example fa_0.gif = Kazham, 7b_0.gif = Yuhtunga Jungle). The registry
// historically used uppercase hex filenames, which produced the black/missing boxes.
(function(){
  const maps=window.CR_ZONE_MAPS||{};
  const raw='https://raw.githubusercontent.com/khoa002/ffxi-mappy/master/Maps/';
  const cdn='https://cdn.jsdelivr.net/gh/khoa002/ffxi-mappy@master/Maps/';

  function fixRemote(u){
    let s=String(u||'');
    if(s.startsWith(raw))s=s.replace(raw,cdn);
    if(!s.startsWith(cdn))return s;
    const prefix=cdn;
    const file=s.slice(prefix.length);
    // Only normalize Mappy's hex map filename; leave the rest of the URL untouched.
    return prefix+file.replace(/^([0-9A-Fa-f]{2})(_(?:\{n\}|\d+)\.gif)$/,(all,hex,tail)=>hex.toLowerCase()+tail);
  }

  Object.values(maps).forEach(m=>{
    if(!m)return;
    if(Array.isArray(m.maps))m.maps=m.maps.map(fixRemote);
    if(m.remoteTemplate)m.remoteTemplate=fixRemote(m.remoteTemplate);
  });
})();
