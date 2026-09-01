const jobs = [
  { code:'WAR', name:'Warrior', role:['damage','defense'], summary:'A flexible frontline attacker built around weapon mastery, aggression, and reliable hate tools.', abilities:['Provoke','Berserk','Warcry'], macros:[['Provoke','/ja "Provoke" <t>'],['Berserk','/ja "Berserk" <me>'],['Warcry','/ja "Warcry" <me>']] },
  { code:'MNK', name:'Monk', role:['damage'], summary:'A hand-to-hand specialist with rapid attacks, strong survivability, and simple self-buffs.', abilities:['Boost','Focus','Chakra'], macros:[['Boost','/ja "Boost" <me>'],['Focus','/ja "Focus" <me>'],['Chakra','/ja "Chakra" <me>']] },
  { code:'WHM', name:'White Mage', role:['support'], summary:'The premier healer, protecting parties with cures, status removal, and defensive magic.', abilities:['Cure IV','Haste','Erase'], macros:[['Cure IV','/ma "Cure IV" <stpc>'],['Haste','/ma "Haste" <stpc>'],['Erase','/ma "Erase" <stpc>']] },
  { code:'BLM', name:'Black Mage', role:['damage'], summary:'A destructive caster specializing in elemental bursts, crowd control, and magical pressure.', abilities:['Fire IV','Sleep II','Stun'], macros:[['Fire IV','/ma "Fire IV" <stnpc>'],['Sleep II','/ma "Sleep II" <stnpc>'],['Stun','/ma "Stun" <t>']] },
  { code:'RDM', name:'Red Mage', role:['support','damage'], summary:'A versatile spellblade that enhances allies, weakens enemies, and adapts to party needs.', abilities:['Refresh II','Haste II','Slow II'], macros:[['Refresh II','/ma "Refresh II" <stpc>'],['Haste II','/ma "Haste II" <stpc>'],['Slow II','/ma "Slow II" <stnpc>']] },
  { code:'THF', name:'Thief', role:['damage'], summary:'An agile damage dealer using positional attacks, treasure hunter, and enmity control.', abilities:['Sneak Attack','Trick Attack','Steal'], macros:[['Sneak Attack','/ja "Sneak Attack" <me>'],['Trick Attack','/ja "Trick Attack" <me>'],['Steal','/ja "Steal" <t>']] },
  { code:'PLD', name:'Paladin', role:['defense'], summary:'A shield-bearing defender with strong enmity tools, cures, and emergency mitigation.', abilities:['Flash','Sentinel','Cover'], macros:[['Flash','/ma "Flash" <t>'],['Sentinel','/ja "Sentinel" <me>'],['Cover','/ja "Cover" <stpc>']] },
  { code:'DRK', name:'Dark Knight', role:['damage'], summary:'A heavy attacker combining powerful weapons with dark magic and risky offensive buffs.', abilities:['Last Resort','Souleater','Stun'], macros:[['Last Resort','/ja "Last Resort" <me>'],['Souleater','/ja "Souleater" <me>'],['Stun','/ma "Stun" <t>']] },
  { code:'BST', name:'Beastmaster', role:['pet','damage'], summary:'A solo-friendly pet commander who charms creatures or calls jug pets into battle.', abilities:['Charm','Fight','Heel'], macros:[['Charm','/ja "Charm" <t>'],['Fight','/pet "Fight" <t>'],['Heel','/pet "Heel" <me>']] },
  { code:'BRD', name:'Bard', role:['support'], summary:'A musical support job that strengthens allies and controls enemies with songs.', abilities:['Victory March','Foe Lullaby II','Magic Finale'], macros:[['Victory March','/ma "Victory March" <me>'],['Foe Lullaby II','/ma "Foe Lullaby II" <t>'],['Magic Finale','/ma "Magic Finale" <t>']] },
  { code:'RNG', name:'Ranger', role:['damage'], summary:'A precision ranged attacker that manages distance, ammunition, and burst windows.', abilities:['Ranged Attack','Barrage','Sharpshot'], macros:[['Ranged Attack','/ra <t>'],['Barrage','/ja "Barrage" <me>'],['Sharpshot','/ja "Sharpshot" <me>']] },
  { code:'SAM', name:'Samurai', role:['damage'], summary:'A tactical weapon-skill specialist that builds TP quickly and creates skillchains.', abilities:['Hasso','Third Eye','Meditate'], macros:[['Hasso','/ja "Hasso" <me>'],['Third Eye','/ja "Third Eye" <me>'],['Meditate','/ja "Meditate" <me>']] },
  { code:'NIN', name:'Ninja', role:['damage','defense'], summary:'An evasive fighter using shadows, dual wielding, and elemental ninjutsu.', abilities:['Utsusemi: Ni','Katon: Ni','Yonin'], macros:[['Utsusemi: Ni','/ma "Utsusemi: Ni" <me>'],['Katon: Ni','/ma "Katon: Ni" <t>'],['Yonin','/ja "Yonin" <me>']] },
  { code:'DRG', name:'Dragoon', role:['pet','damage'], summary:'A polearm fighter partnered with a wyvern and equipped with tactical jumps.', abilities:['Jump','High Jump','Spirit Link'], macros:[['Jump','/ja "Jump" <t>'],['High Jump','/ja "High Jump" <t>'],['Spirit Link','/ja "Spirit Link" <me>']] },
  { code:'SMN', name:'Summoner', role:['pet','support','damage'], summary:'An avatar master whose pacts provide magical damage, healing, and party support.', abilities:['Carbuncle','Assault','Retreat'], macros:[['Carbuncle','/ma "Carbuncle" <me>'],['Assault','/pet "Assault" <t>'],['Retreat','/pet "Retreat" <me>']] },
  { code:'BLU', name:'Blue Mage', role:['damage','support'], summary:'A customizable spellcaster that learns monster abilities and creates unique trait sets.', abilities:['Head Butt','Chain Affinity','Burst Affinity'], macros:[['Head Butt','/ma "Head Butt" <t>'],['Chain Affinity','/ja "Chain Affinity" <me>'],['Burst Affinity','/ja "Burst Affinity" <me>']] },
  { code:'COR', name:'Corsair', role:['support','damage'], summary:'A ranged support job using dice rolls, cards, and marksmanship to shape the fight.', abilities:['Chaos Roll','Double-Up','Fire Shot'], macros:[['Chaos Roll','/ja "Chaos Roll" <me>'],['Double-Up','/ja "Double-Up" <me>'],['Fire Shot','/ja "Fire Shot" <t>']] },
  { code:'PUP', name:'Puppetmaster', role:['pet','damage'], summary:'A hand-to-hand combatant who configures and directs a customizable automaton.', abilities:['Activate','Deploy','Retrieve'], macros:[['Activate','/ja "Activate" <me>'],['Deploy','/pet "Deploy" <t>'],['Retrieve','/pet "Retrieve" <me>']] },
  { code:'DNC', name:'Dancer', role:['support','damage'], summary:'A TP-powered melee supporter providing healing, debuffs, and party-wide sambas.', abilities:['Box Step','Haste Samba','Curing Waltz III'], macros:[['Box Step','/ja "Box Step" <t>'],['Haste Samba','/ja "Haste Samba" <me>'],['Curing Waltz III','/ja "Curing Waltz III" <stpc>']] },
  { code:'SCH', name:'Scholar', role:['support','damage'], summary:'A tactical mage that switches arts and uses stratagems to reshape spells.', abilities:['Light Arts','Dark Arts','Accession'], macros:[['Light Arts','/ja "Light Arts" <me>'],['Dark Arts','/ja "Dark Arts" <me>'],['Accession','/ja "Accession" <me>']] },
  { code:'GEO', name:'Geomancer', role:['support','damage'], summary:'A field-control mage creating powerful auras through indicolure and geocolure.', abilities:['Indi-Fury','Geo-Frailty','Full Circle'], macros:[['Indi-Fury','/ma "Indi-Fury" <me>'],['Geo-Frailty','/ma "Geo-Frailty" <t>'],['Full Circle','/ja "Full Circle" <me>']] },
  { code:'RUN', name:'Rune Fencer', role:['defense','damage'], summary:'A magical defender using runes, wards, and great swords to counter elemental threats.', abilities:['Ignis','Vallation','Gambit'], macros:[['Ignis','/ja "Ignis" <me>'],['Vallation','/ja "Vallation" <me>'],['Gambit','/ja "Gambit" <t>']] }
];

let selected = 'WAR';
let filter = 'all';
const list = document.querySelector('#job-list');
const detail = document.querySelector('#job-detail');

function renderList(query = '') {
  const needle = query.trim().toLowerCase();
  const matches = jobs.filter(job => (filter === 'all' || job.role.includes(filter)) && (`${job.code} ${job.name}`.toLowerCase().includes(needle)));
  list.innerHTML = matches.map(job => `<button class="job-button ${job.code === selected ? 'active' : ''}" data-job="${job.code}"><span>${job.code}</span><small>${job.name}</small></button>`).join('') || '<p class="empty">No jobs match that search.</p>';
  list.querySelectorAll('[data-job]').forEach(button => button.addEventListener('click', () => { selected = button.dataset.job; renderList(document.querySelector('#job-search').value); renderDetail(); }));
}

function renderDetail() {
  const job = jobs.find(entry => entry.code === selected) || jobs[0];
  detail.innerHTML = `<div class="job-heading"><span class="job-seal">${job.code}</span><div><p class="eyebrow">Macro loadout</p><h3>${job.name}</h3></div></div><p>${job.summary}</p><div class="ability-tags">${job.abilities.map(a => `<span>${a}</span>`).join('')}</div><h4>Starter macro set</h4><div class="macro-grid">${job.macros.map(([name,line]) => `<article class="macro-card"><strong>${name}</strong><code>${line}</code><button class="copy-button" data-copy="${line.replaceAll('"','&quot;')}">Copy macro</button></article>`).join('')}</div><p class="field-note">Macros are starting points. Adjust targets, waits, and equipment swaps for your own play style and server rules.</p>`;
  detail.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => { await navigator.clipboard.writeText(button.dataset.copy); const old = button.textContent; button.textContent = 'Copied'; setTimeout(() => button.textContent = old, 1200); }));
}

document.querySelector('#job-search').addEventListener('input', event => renderList(event.target.value));
document.querySelectorAll('#role-filters [data-role]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.role; document.querySelectorAll('#role-filters [data-role]').forEach(item => item.classList.toggle('active', item === button)); renderList(document.querySelector('#job-search').value); }));
renderList();
renderDetail();
