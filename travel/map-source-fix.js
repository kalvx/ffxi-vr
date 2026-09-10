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
    const file=s.slice(cdn.length);
    return cdn+file.replace(/^([0-9A-Fa-f]{2})(_(?:\{n\}|\d+)\.gif)$/,(all,hex,tail)=>hex.toLowerCase()+tail);
  }

  Object.values(maps).forEach(m=>{
    if(!m)return;
    if(Array.isArray(m.maps))m.maps=m.maps.map(fixRemote);
    if(m.remoteTemplate)m.remoteTemplate=fixRemote(m.remoteTemplate);
  });

  // A number of Mappy zones either have no usable _0 image or have useful floors
  // at non-sequential suffixes (for example Gusgen also uses _4). If a remote
  // preview fails, try the remaining files for that *same verified zone hex*.
  // This never changes Current Reality's working local WebP maps.
  function candidatesFor(zone){
    const m=maps[zone];
    if(!m||!m.remoteTemplate)return[];
    const out=[];
    for(let n=0;n<=12;n++)out.push(m.remoteTemplate.replace('{n}',n));
    return out.filter((u,i,a)=>u&&!m.maps.includes(u)&&a.indexOf(u)===i);
  }

  function recoverPreview(img){
    const zone=img?.dataset?.mapPreview;
    const m=maps[zone];
    if(!m||!m.remoteTemplate||String(m.maps?.[0]||'').startsWith('maps/'))return;
    const candidates=candidatesFor(zone);
    let i=0;
    const tryNext=()=>{
      if(i>=candidates.length){img.onerror=null;return;}
      const url=candidates[i++];
      const probe=new Image();
      probe.onload=()=>{
        const old=m.maps[0];
        m.maps[0]=url;
        if(old&&old!==url&&!m.maps.includes(old))m.maps.push(old);
        img.onerror=null;
        img.src=url;
      };
      probe.onerror=tryNext;
      probe.src=url;
    };
    tryNext();
  }

  // zone-routes.js creates cards after this script runs, so watch for preview images
  // and attach recovery only to remote Mappy maps.
  const attach=()=>document.querySelectorAll('img[data-map-preview]').forEach(img=>{
    if(img.dataset.mapRecoveryAttached)return;
    img.dataset.mapRecoveryAttached='1';
    img.addEventListener('error',()=>recoverPreview(img));
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach,{once:true});
  else attach();
  new MutationObserver(attach).observe(document.documentElement,{childList:true,subtree:true});
})();
