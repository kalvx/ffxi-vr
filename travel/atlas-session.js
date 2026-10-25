(function(){
  const key='cr-atlas-view-v1',select=document.querySelector('#route-expansion'),search=document.querySelector('#route-search'),root=document.querySelector('#world-route-root');
  let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
  const remember=()=>{try{localStorage.setItem(key,JSON.stringify({expansion:select.value,query:search.value,open:[...root.querySelectorAll('details[open]')].map(node=>{const card=node.closest('.route-card');return card?{zone:card.dataset.zone,label:node.querySelector('summary')?.textContent}:null}).filter(Boolean)}))}catch{}};
  function restore(){for(const row of saved.open||[]){const card=[...root.querySelectorAll('.route-card')].find(node=>node.dataset.zone===row.zone);card?.querySelectorAll('details').forEach(node=>{if(node.querySelector('summary')?.textContent===row.label)node.open=true})}}
  select.addEventListener('change',()=>{restore();remember()});search.addEventListener('input',()=>{restore();remember()});root.addEventListener('toggle',remember,true);window.addEventListener('cr:zone-loaded',restore);
  if(saved.expansion&&[...select.options].some(option=>option.value===saved.expansion)){
    select.value=saved.expansion;search.value=saved.query||'';select.dispatchEvent(new Event('change',{bubbles:true}));
  }
})();
