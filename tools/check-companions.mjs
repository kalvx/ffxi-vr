import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const catalog=JSON.parse(read('trusts/purchase-data.json'));
const index=read('trusts/index.html'),guide=read('guides/five-trusts.html'),workers=read('guides/workers.html');
assert.equal(catalog.length,119);
for(const item of catalog){
  const escape=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#x27;');
  assert.ok(index.includes(`<td>${escape(item.name)}</td><td>${escape(item.role)}</td><td>${item.seals}</td>`),item.name);
}
assert.ok(!index.includes('Up to three Trusts at once.'));
assert.ok(!index.includes('Rhapsody in White raises capacity to four'));
assert.ok(index.includes('Monberaux is unavailable'));
assert.ok(guide.includes('five purchased, compatible Trusts'));
assert.ok(guide.includes('one-seal discount'));
assert.ok(!guide.includes('My automaton')&&!workers.includes('forbidden mixtures'));
for(const text of ['Bram','Nessa','Dorrik','Pipiri','1 Potion','3 Potion','6 Potion','12 Insect paste','36 Insect paste','72 Insect paste','Worker messages: On/Off','Collect [amount] gil','Last sales report','50–60 minutes','Lower Jeuno']) assert.ok(workers.includes(text),text);
const people=JSON.parse(read('npcs/quest-index.json'));
for(const [name,zone] of [['Trusty-Musky','Mhaura'],['Vapor','Lower Jeuno']]){
  const rows=people.filter(p=>p.name===name);assert.equal(rows.length,1);assert.ok(rows[0].zones.includes(zone));
}
for(const file of ['trusts/index.html','guides/five-trusts.html','guides/workers.html','guides/index.html']){
 const text=read(file);
 for(const [,href] of text.matchAll(/href="([^"]+)"/g)){
  if(/^(https?:|#|mailto:)/.test(href))continue;
  const target=path.resolve(root,path.dirname(file),href.split(/[?#]/)[0]);
  assert.ok(fs.existsSync(target),`${file} -> ${href}`);
 }
}
console.log('PASS: all 119 published prices, capacity/worker instructions, NPC directory entries and local guide links.');
