// Versioned Current Reality zone shards; persistent, deduplicated, retryable.
(function(){
  const memory=new Map();let storage;
  const base=new URL('atlas-data/',document.currentScript.src);
  function database(){
    if(!storage)storage=new Promise(resolve=>{
      try{const request=indexedDB.open('cr-atlas-cache',1);request.onupgradeneeded=()=>request.result.createObjectStore('zones');request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null)}catch{resolve(null)}
    });return storage;
  }
  async function cached(key){const db=await database();if(!db)return null;return new Promise(resolve=>{try{const q=db.transaction('zones').objectStore('zones').get(key);q.onsuccess=()=>resolve(q.result||null);q.onerror=()=>resolve(null)}catch{resolve(null)}})}
  async function save(key,value){const db=await database();if(!db)return;try{db.transaction('zones','readwrite').objectStore('zones').put(value,key)}catch{}}
  async function resource(file,key,validate=()=>true){
    if(memory.has(key))return memory.get(key);
    const promise=(async()=>{
      const prior=await cached(key);if(prior&&validate(prior))return prior;
      const response=await fetch(new URL(file,base),{signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('Atlas data HTTP '+response.status);
      const data=await response.json();if(!validate(data))throw new Error('Invalid atlas data');await save(key,data);return data;
    })().catch(error=>{memory.delete(key);throw error});memory.set(key,promise);return promise;
  }
  async function loadZone(zoneId,onStatus,zoneName){
    const areas=window.CR_ATLAS_INDEX?.areas||{},area=areas[zoneName]||Object.values(areas).find(row=>row.zoneId===Number(zoneId));
    if(!area)throw new Error('No matched server area for '+(zoneName||zoneId));
    onStatus?.('Loading Current Reality records for '+area.name+'…');
    const data=await resource(area.file,area.file+'/'+area.hash,data=>data.version===1&&data.zone===area.name&&Array.isArray(data.mobs)&&Array.isArray(data.npcs));
    onStatus?.(`${area.mobCount} monster entries and ${area.npcCount} NPC entries ready.`);return data;
  }
  window.CR_ZONE_DB={loadZone,resource,base};
})();
