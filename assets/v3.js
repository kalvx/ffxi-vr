const referenceData = {
  items: [
    ['Potion','Medicine','Restores a small amount of HP','Usable'],['Echo Drops','Medicine','Removes Silence','Usable'],['Antidote','Medicine','Removes Poison','Usable'],['Silent Oil','Medicine','Grants Sneak','Usable'],['Prism Powder','Medicine','Grants Invisible','Usable'],['Fire Crystal','Crystal','Fire-aligned synthesis crystal','Crafting'],['Earth Crystal','Crystal','Earth-aligned synthesis crystal','Crafting'],['Copper Ore','Metal','Common smithing material','Crafting'],['Beehive Chip','Material','Alchemy and crafting ingredient','Drop'],['Rabbit Hide','Leather','Early leathercraft material','Drop'],['Moat Carp','Fish','A famously valuable fishing catch','Fishing'],['Empress Band','Equipment','Experience-point bonus charges','Ring'],['Warp Ring','Equipment','Reusable Warp enchantment','Ring'],['Chocobo Shirt','Equipment','Movement and early-adventure utility','Body'],['Reraise Earring','Equipment','Grants Reraise through enchantment','Earring'],['Tavnazian Taco','Food','Defense-oriented meal','Food'],['Sole Sushi','Food','Accuracy-oriented meal','Food'],['Yagudo Drink','Drink','Refresh effect over time','Drink']
  ],
  spells: [
    ['Cure IV','WHM · RDM · PLD · SCH','Restores a target’s HP','Healing'],['Raise III','WHM','Revives a defeated player with reduced experience loss','Healing'],['Erase','WHM · SCH','Removes one removable status ailment','Healing'],['Protect IV','WHM · RDM · PLD · SCH','Raises defense','Enhancing'],['Shell IV','WHM · RDM · PLD · SCH','Raises magic defense','Enhancing'],['Haste','WHM · RDM · SCH','Reduces attack delay and recast','Enhancing'],['Refresh II','RDM','Restores MP over time','Enhancing'],['Fire IV','BLM · RDM · SCH','Deals fire-elemental damage','Elemental'],['Blizzard IV','BLM · RDM · SCH','Deals ice-elemental damage','Elemental'],['Thunder IV','BLM · RDM · SCH','Deals lightning-elemental damage','Elemental'],['Sleep II','BLM · RDM · SCH','Puts enemies to sleep','Enfeebling'],['Slow II','RDM','Increases enemy attack delay','Enfeebling'],['Stun','BLM · DRK · SCH','Briefly prevents enemy action','Dark'],['Utsusemi: Ni','NIN','Creates shadow images that absorb attacks','Ninjutsu'],['Indi-Fury','GEO','Creates an attack-boosting aura','Geomancy'],['Geo-Frailty','GEO','Creates a defense-reducing luopan field','Geomancy'],['Head Butt','BLU','Physical blue magic with interruption potential','Blue Magic'],['Carbuncle','SMN','Summons the Carbuncle avatar','Summoning']
  ],
  weaponSkills: [
    ['Combo','Hand-to-Hand','Impaction','MNK · PUP'],['Raging Fists','Hand-to-Hand','Impaction · Liquefaction','MNK · PUP'],['Dancing Edge','Dagger','Scission · Detonation','THF · DNC'],['Evisceration','Dagger','Gravitation · Transfixion','THF · DNC'],['Savage Blade','Sword','Fragmentation · Scission','PLD · RDM · BLU'],['Chant du Cygne','Sword','Light · Distortion','PLD · RDM · BLU'],['Resolution','Great Sword','Fragmentation · Scission','DRK · RUN'],['Raging Rush','Great Axe','Induration · Reverberation','WAR'],['Ukko’s Fury','Great Axe','Light · Fragmentation','WAR'],['Rampage','Axe','Scission','WAR · BST'],['Guillotine','Scythe','Induration','DRK'],['Stardiver','Polearm','Gravitation · Transfixion','DRG'],['Tachi: Kasha','Great Katana','Fusion · Compression','SAM'],['Tachi: Fudo','Great Katana','Light · Distortion','SAM'],['Blade: Jin','Katana','Detonation · Impaction','NIN'],['Blade: Hi','Katana','Darkness · Gravitation','NIN'],['Hexa Strike','Club','Fusion','WHM'],['Shattersoul','Staff','Gravitation · Induration','Mage jobs'],['Sidewinder','Archery','Reverberation · Transfixion','RNG'],['Slug Shot','Marksmanship','Reverberation · Transfixion','RNG · COR']
  ],
  jobAbilities: [
    ['Provoke','WAR','Raises enmity toward the user','30 sec'],['Berserk','WAR','Raises attack while lowering defense','5 min'],['Chakra','MNK','Restores HP and can remove ailments','5 min'],['Divine Seal','WHM','Enhances the next healing spell','10 min'],['Elemental Seal','BLM','Raises accuracy of the next spell','10 min'],['Convert','RDM','Swaps current HP and MP','10 min'],['Sneak Attack','THF','Enhances the next attack from behind','1 min'],['Sentinel','PLD','Greatly raises defense and enmity','5 min'],['Last Resort','DRK','Raises attack while lowering defense','5 min'],['Familiar','BST','Empowers a charmed pet','1 hour'],['Soul Voice','BRD','Greatly enhances songs','1 hour'],['Barrage','RNG','Adds multiple shots to the next ranged attack','5 min'],['Meditate','SAM','Gradually grants TP','3 min'],['Yonin','NIN','Improves defensive tanking tools','5 min'],['Spirit Link','DRG','Transfers HP to the wyvern','3 min'],['Astral Flow','SMN','Unlocks powerful avatar abilities','1 hour'],['Chain Affinity','BLU','Lets physical blue magic participate in skillchains','2 min'],['Double-Up','COR','Attempts to improve the active roll','—'],['Deploy','PUP','Orders the automaton to attack','—'],['Curing Waltz III','DNC','Restores a party member’s HP using TP','—'],['Accession','SCH','Makes the next compatible spell area-of-effect','Stratagem'],['Full Circle','GEO','Dismisses a luopan and restores MP','10 sec'],['Vallation','RUN','Raises elemental defense for party members','3 min']
  ]
};

const datasetNames = {items:'Items',spells:'Spells',weaponSkills:'Weapon skills',jobAbilities:'Job abilities'};
let activeDataset = 'items';

function renderReference() {
  const query = document.querySelector('#reference-search').value.trim().toLowerCase();
  const rows = referenceData[activeDataset].filter(row => row.join(' ').toLowerCase().includes(query));
  document.querySelector('#reference-count').textContent = `${rows.length} ${datasetNames[activeDataset].toLowerCase()}`;
  const visible = rows.slice(0, 120);
  document.querySelector('#reference-grid').innerHTML = visible.map(row => `<article><div><span>${row[3]}</span><h3>${row[0]}</h3></div><b>${row[1]}</b><p>${row[2]}</p></article>`).join('') || '<p class="empty">No matching records.</p>';
  if (rows.length > visible.length) document.querySelector('#reference-grid').insertAdjacentHTML('beforeend', `<p class="empty result-limit">Showing the first ${visible.length}. Refine your search to reach the remaining ${rows.length - visible.length} records.</p>`);
}

document.querySelectorAll('#reference-tabs [data-dataset]').forEach(button => button.addEventListener('click', () => {
  activeDataset = button.dataset.dataset;
  document.querySelectorAll('#reference-tabs button').forEach(item => item.classList.toggle('active', item === button));
  document.querySelector('#reference-search').value = '';
  renderReference();
}));
document.querySelector('#reference-search').addEventListener('input', renderReference);

const chains = {
  Transfixion:[['Compression','Compression',1],['Scission','Distortion',2],['Reverberation','Reverberation',1]],
  Compression:[['Transfixion','Transfixion',1],['Detonation','Detonation',1]],
  Liquefaction:[['Impaction','Fusion',2],['Scission','Scission',1]],
  Scission:[['Liquefaction','Liquefaction',1],['Reverberation','Reverberation',1],['Detonation','Detonation',1]],
  Reverberation:[['Induration','Induration',1],['Impaction','Impaction',1]],
  Detonation:[['Compression','Gravitation',2],['Scission','Scission',1]],
  Induration:[['Reverberation','Fragmentation',2],['Compression','Compression',1],['Impaction','Impaction',1]],
  Impaction:[['Liquefaction','Liquefaction',1],['Detonation','Detonation',1]],
  Fusion:[['Gravitation','Fragmentation',2],['Fragmentation','Light',3]],
  Fragmentation:[['Fusion','Light',3],['Distortion','Distortion',2]],
  Distortion:[['Fusion','Fusion',2],['Gravitation','Darkness',3]],
  Gravitation:[['Fragmentation','Fragmentation',2],['Distortion','Darkness',3]],
  Light:[['Light','Light',3]],
  Darkness:[['Darkness','Darkness',3]]
};
let activeChain = 'Transfixion';

function renderChains() {
  document.querySelector('#chain-picker').innerHTML = Object.keys(chains).map(name => `<button class="${name === activeChain ? 'active' : ''}" data-chain="${name}">${name}</button>`).join('');
  document.querySelector('#chain-results').innerHTML = chains[activeChain].map(([follow,result,level]) => `<article class="chain-level-${level}"><span>Follow with</span><strong>${follow}</strong><i>→</i><div><small>Result</small><b>${result}</b><em>Level ${level}</em></div></article>`).join('');
  document.querySelectorAll('[data-chain]').forEach(button => button.addEventListener('click', () => { activeChain = button.dataset.chain; renderChains(); }));
}

function updateVanaClock() {
  const vanaMilliseconds = (Date.now() - Date.UTC(2001,11,31,15,0,0)) * 25;
  const totalSeconds = Math.floor(vanaMilliseconds / 1000);
  const daySeconds = ((totalSeconds % 86400) + 86400) % 86400;
  const hour = Math.floor(daySeconds / 3600);
  const minute = Math.floor((daySeconds % 3600) / 60);
  const totalDays = Math.floor(totalSeconds / 86400);
  const year = Math.floor(totalDays / 360) + 886;
  const dayOfYear = ((totalDays % 360) + 360) % 360;
  const month = Math.floor(dayOfYear / 30) + 1;
  const day = dayOfYear % 30 + 1;
  const weekdays = ['Firesday','Earthsday','Watersday','Windsday','Iceday','Lightningday','Lightsday','Darksday'];
  document.querySelector('#vana-time').textContent = `${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`;
  document.querySelector('#vana-date').textContent = `${weekdays[((totalDays % 8) + 8) % 8]} · ${year}/${String(month).padStart(2,'0')}/${String(day).padStart(2,'0')}`;
}

renderReference();
renderChains();
