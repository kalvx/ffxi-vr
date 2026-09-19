import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const api='https://www.bg-wiki.com/api.php?action=parse&page=Category%3AArtifact%20Armor&prop=wikitext&format=json';
const response=await fetch(api);if(!response.ok)throw new Error(`Artifact source returned ${response.status}`);
const source=(await response.json()).parse.wikitext['*'];
const slugs={Warrior:'war',Monk:'mnk','White Mage':'whm','Black Mage':'blm','Red Mage':'rdm',Thief:'thf',Paladin:'pld','Dark Knight':'drk',Beastmaster:'bst',Bard:'brd',Ranger:'rng',Samurai:'sam',Ninja:'nin',Dragoon:'drg',Summoner:'smn','Blue Mage':'blu',Corsair:'cor',Puppetmaster:'pup',Dancer:'dnc',Scholar:'sch',Geomancer:'geo','Rune Fencer':'run'};
const plain=s=>String(s||'').replace(/'''/g,'').replace(/<br\s*\/?\s*>/gi,' · ').replace(/&middot;/g,'·').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g,'$2').replace(/\[\[([^\]]+)\]\]/g,'$1').replace(/\{\{[^{}]*\}\}/g,'').replace(/---x---/g,'None').replace(/\s+/g,' ').trim();
const linkTarget=s=>(String(s||'').match(/\[\[([^\]|]+)/)||[])[1]||'';
const result={};
const headings=[...source.matchAll(/^==\s*([^=]+?)\s*==\s*$/gm)];
for(let h=0;h<headings.length;h++){
 const name=headings[h][1].trim(),slug=slugs[name];if(!slug)continue;
 const section=source.slice(headings[h].index+(headings[h][0].length),h+1<headings.length?headings[h+1].index:source.length);
 const rows=[];
 for(let n=1;n<=6;n++){
  const get=key=>{const m=section.match(new RegExp(`\\|af ${key} ${n}=([\\s\\S]*?)(?=\\n\\|af |\\n}}|$)`));return m?.[1]||''};
  const slot=get('slot'),quest=get('quest'),items=get('items needed'),piece=get('armor piece');
  if(slot||quest||piece)rows.push({slot:plain(slot),piece:plain(piece),route:plain(quest),items:plain(items),source:linkTarget(quest)});
 }
 result[slug]=rows;
}
result.geo=[];result.run=[];
const pages=[...new Set(Object.values(result).flat().map(row=>row.source).filter(Boolean))];
const starts=new Map();
for(let offset=0;offset<pages.length;offset+=8){
 await Promise.all(pages.slice(offset,offset+8).map(async page=>{
  const url='https://www.bg-wiki.com/api.php?'+new URLSearchParams({action:'parse',page,prop:'wikitext',format:'json'});
  try{const r=await fetch(url);const text=(await r.json()).parse?.wikitext?.['*']||'';const start=(text.match(/^\|Start=([^\n]+)/m)||[])[1]||'';starts.set(page,plain(start))}catch{}
 }));
}
for(const rows of Object.values(result))for(const row of rows)row.start=starts.get(row.source)||'';
const banner='// Generated from the BG-Wiki Artifact Armor category; rewritten and rendered by the Current Reality Compendium.\n';
fs.writeFileSync(path.join(root,'jobs/armor/af1-data.js'),banner+`window.CR_AF1_DATA=${JSON.stringify(result,null,2)};\n`);
console.log(`Generated AF1 acquisition rows for ${Object.keys(result).length} jobs.`);
